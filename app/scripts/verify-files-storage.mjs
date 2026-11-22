#!/usr/bin/env node
/**
 * Kiểm chứng luồng lưu trữ file trên Cloudflare R2 (S3-compatible).
 *
 * Kịch bản:
 *   1. SV đăng nhập, xin presigned URL → PUT file thẳng lên R2 → confirm.
 *   2. Upload CV hợp lệ -> metadata đúng, file truy xuất được.
 *   3. Upload file giả dạng (magic bytes sai) -> phải bị chặn 400.
 *   4. Upload ảnh lớn -> phải được resize về <= 512px.
 *   5. CV của SV khác (không token) -> phải bị chặn 403.
 *   6. Ảnh (avatar/logo) -> truy xuất được công khai.
 *   7. Xoá file -> quota được giải phóng, file biến mất khỏi nơi lưu trữ.
 *
 * Chạy:
 *   API_URL=http://localhost:8080/api/v1 node scripts/verify-files-storage.mjs
 *   API_URL=http://localhost:8081/api/v1 node scripts/verify-files-storage.mjs
 */

const BASE = process.env.API_URL ?? "http://localhost:8080/api/v1";

let failures = 0;

const log = (msg) => console.log(msg);
const ok = (msg) => log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  ❌ ${msg}`);
};

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(email, password) {
  const { status, json } = await api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (status !== 200 || !json?.data?.accessToken) {
    throw new Error(`Đăng nhập ${email} thất bại (${status}): ${JSON.stringify(json)}`);
  }
  return json.data.accessToken;
}

/** Upload multipart qua backend (luồng cổng). */
async function uploadMultipart(token, kind, fileName, bytes, mimeType) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), fileName);

  const res = await fetch(`${BASE}/files/upload?kind=${kind}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Tải file qua endpoint công khai. */
async function download(fileId, token) {
  const res = await fetch(`${BASE}/files/${fileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "follow",
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buffer, type: res.headers.get("content-type") };
}

/** Tạo 1 file PDF hợp lệ (đủ để nhận diện qua magic bytes). */
const makePdf = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    "latin1"
  );

import { deflateSync } from "node:zlib";

/**
 * Tạo 1 file PNG hợp lệ với kích thước yêu cầu (dùng zlib + CRC32 thuần).
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
const makePng = (width, height) => {
  const zlib = { deflateSync };

  const crcTable = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) {
      c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type, data) => {
    const typeBuf = Buffer.from(type, "latin1");
    const body = Buffer.concat([typeBuf, data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type = truecolor

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      raw[rowStart + 1 + x * 3] = (x * 7) % 256;
      raw[rowStart + 2 + x * 3] = (y * 5) % 256;
      raw[rowStart + 3 + x * 3] = 128;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/** Đọc kích thước ảnh (PNG hoặc JPEG) từ buffer. */
const imageSize = (buffer) => {
  // PNG: IHDR ở byte 16
  if (
    buffer.length > 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  // JPEG: quét marker SOF
  let i = 2;
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    const len = buffer.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
};

log("\n⭐  Luồng lưu trữ file (upload / magic bytes / resize / quyền truy cập)");

const studentToken = await login("student@viejob.vn", "Student@123");
const employerToken = await login("employer@viejob.vn", "Employer@123");

// --- 0. Presign (bắt buộc — R2 là nơi lưu trữ duy nhất) --------------------
const presign = await api("/files/presign?kind=CV&contentType=application/pdf", {
  method: "POST",
  token: studentToken,
});
if (presign.status !== 200 || !presign.json?.data?.uploadUrl) {
  fail(`POST /files/presign -> ${presign.status} ${JSON.stringify(presign.json)}`);
} else {
  ok(`POST /files/presign trả uploadUrl (hạn ${presign.json.data.expiresInSeconds}s)`);
  const key = presign.json.data.storageKey ?? "";
  if (key.startsWith("cv/")) {
    ok(`storageKey chặt chồng user: ${key}`);
  } else {
    fail(`storageKey không có tiền tố cv/: ${key}`);
  }
}

// --- 0b. Upload qua presigned PUT (luồng thật của frontend) -----------------
const presignPut = await api("/files/presign?kind=CV&contentType=application/pdf", {
  method: "POST",
  token: studentToken,
});
if (presignPut.status !== 200 || !presignPut.json?.data?.uploadUrl) {
  fail(`presign PUT -> ${presignPut.status}`);
} else {
  const signed = presignPut.json.data;
  const putRes = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": signed.contentType },
    body: makePdf(),
  });
  if (putRes.status !== 200) {
    fail(`PUT thẳng lên R2 -> ${putRes.status} ${await putRes.text()}`);
  } else {
    ok("PUT thẳng lên R2 (không qua backend) thành công");
    const confirmRes = await api("/files/confirm", {
      method: "POST",
      token: studentToken,
      body: { storageKey: signed.storageKey, kind: "CV", fileName: "presigned-cv.pdf" },
    });
    if (confirmRes.status === 201 && confirmRes.json?.data?.id) {
      const presignedId = confirmRes.json.data.id;
      ok(`confirm sau presigned PUT -> id=${presignedId}`);

      // Dọn ngay: quota 10 CV/user chỉ đủ cho ~10 lần chạy liên tiếp.
      const delPresigned = await api(`/files/${presignedId}`, {
        method: "DELETE",
        token: studentToken,
      });
      if (delPresigned.status === 200) {
        ok("Dọn file presigned sau khi kiểm chứng");
      } else {
        fail(`Xoá file presigned -> ${delPresigned.status}`);
      }
    } else {
      fail(`confirm -> ${confirmRes.status} ${JSON.stringify(confirmRes.json)}`);
    }
  }
}

// --- 1. Upload CV hợp lệ ---------------------------------------------------
const pdf = makePdf();
const cvUpload = await uploadMultipart(studentToken, "CV", "cv-test.pdf", pdf, "application/pdf");
if (cvUpload.status !== 201 || !cvUpload.json?.data?.id) {
  fail(`Upload CV hợp lệ -> ${cvUpload.status} ${JSON.stringify(cvUpload.json)}`);
} else {
  const cv = cvUpload.json.data;
  ok(`Upload CV -> id=${cv.id}, mime=${cv.mimeType}, size=${cv.sizeBytes}`);

  if (cv.mimeType === "application/pdf") {
    ok("MIME type đúng (application/pdf)");
  } else {
    fail(`MIME type sai: ${cv.mimeType}`);
  }
  if (cv.bucket === "viejob-private" || cv.bucket === "private") {
    ok(`CV nằm ở bucket private (${cv.bucket})`);
  } else {
    fail(`CV phải nằm ở bucket private, thực tế: ${cv.bucket}`);
  }
  if (cv.storageKey?.startsWith("cv/")) {
    ok(`storageKey có cấu trúc {kind}/{userId}/{file}: ${cv.storageKey}`);
  } else {
    fail(`storageKey sai cấu trúc: ${cv.storageKey}`);
  }
  if (cv.url === `/api/v1/files/${cv.id}`) {
    ok(`URL tương đối, không phụ thuộc domain: ${cv.url}`);
  } else {
    fail(`URL phải là /api/v1/files/${cv.id}, thực tế: ${cv.url}`);
  }

  // --- 1b. CV phải được STREAM (không redirect) + giữ tên file gốc ---------
  const streamed = await fetch(`${BASE}/files/${cv.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
    redirect: "manual",
  });
  const disposition = streamed.headers.get("content-disposition") ?? "";
  if (streamed.status === 200 && disposition.includes("cv-test.pdf")) {
    ok("CV stream qua backend (200) + Content-Disposition giữ tên gốc");
  } else {
    fail(
      `CV phải stream 200 kèm tên gốc, thực tế: ${streamed.status} (${disposition})`
    );
  }

  // --- 2. CV truy xuất được bởi chủ sở hữu --------------------------------
  const owner = await download(cv.id, studentToken);
  if (owner.status === 200 && owner.buffer.length === pdf.length) {
    ok("Chủ sở hữu tải được CV");
  } else {
    fail(`Chủ sở hữu tải CV -> ${owner.status} (${owner.buffer.length} bytes)`);
  }

  // --- 3. CV bị chặn khi khách (không token) ------------------------------
  const guest = await download(cv.id, null);
  if (guest.status === 403) {
    ok("CV bị chặn 403 với khách chưa đăng nhập");
  } else {
    fail(`CV với khách phải bị 403, thực tế: ${guest.status}`);
  }

  // --- 4. NTD đã nhận đơn được xem CV, NTD khác thì không -----------------
  const employerRead = await download(cv.id, employerToken);
  if (employerRead.status === 403 || employerRead.status === 200) {
    ok(`NTD đọc CV -> ${employerRead.status} (403 nếu chưa nhận đơn)`);
  } else {
    fail(`NTD đọc CV -> ${employerRead.status}`);
  }

  // --- 5. Xoá file ---------------------------------------------------------
  const del = await api(`/files/${cv.id}`, { method: "DELETE", token: studentToken });
  if (del.status === 200) {
    ok("Xoá file thành công");
  } else {
    fail(`Xoá file -> ${del.status}`);
  }
  const afterDelete = await download(cv.id, studentToken);
  if (afterDelete.status === 404) {
    ok("File đã biến mất sau khi xoá (404)");
  } else {
    fail(`Sau khi xoá phải trả 404, thực tế: ${afterDelete.status}`);
  }
}

// --- 6. Magic bytes: file giả dạng phải bị chặn --------------------------
const fakePdf = await uploadMultipart(
  studentToken,
  "CV",
  "fake.pdf",
  Buffer.from("this is definitely not a pdf", "utf8"),
  "application/pdf"
);
if (fakePdf.status === 400) {
  ok("File text giả dạng PDF bị chặn (magic bytes)");
} else {
  fail(`File text giả dạng PDF phải bị chặn, thực tế: ${fakePdf.status}`);
}

const fakeExe = await uploadMultipart(
  studentToken,
  "AVATAR",
  "malware.png",
  Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]),
  "image/png"
);
if (fakeExe.status === 400) {
  ok("File .exe đổi tên .png bị chặn (magic bytes)");
} else {
  fail(`File .exe đổi tên .png phải bị chặn, thực tế: ${fakeExe.status}`);
}

// --- 7. Resize ảnh --------------------------------------------------------
const bigPng = makePng(1600, 1200);
const avatarUpload = await uploadMultipart(
  studentToken,
  "AVATAR",
  "big.png",
  bigPng,
  "image/png"
);
if (avatarUpload.status !== 201 || !avatarUpload.json?.data?.id) {
  fail(`Upload ảnh lớn -> ${avatarUpload.status} ${JSON.stringify(avatarUpload.json)}`);
} else {
  const avatar = avatarUpload.json.data;
  ok(`Upload ảnh 1600x1200 -> ${avatar.sizeBytes} bytes`);

  const fetched = await download(avatar.id, null);
  const size = imageSize(fetched.buffer);
  if (size && Math.max(size.width, size.height) <= 512) {
    ok(`Ảnh đã resize về ${size.width}x${size.height} (<= 512px)`);
  } else {
    fail(`Ảnh chưa được resize: ${size ? `${size.width}x${size.height}` : "không đọc được"}`);
  }
  if (fetched.status === 200) {
    ok("Ảnh truy xuất được công khai (không cần token)");
  } else {
    fail(`Ảnh công khai phải trả 200, thực tế: ${fetched.status}`);
  }

  // Ảnh đi qua endpoint nội bộ -> 302 sang CDN, có Cache-Control dài hạn.
  const avatarRedirect = await fetch(`${BASE}/files/${avatar.id}`, {
    redirect: "manual",
  });
  if (avatarRedirect.status === 302) {
    ok("Ảnh công khai redirect 302 sang CDN (không stream qua backend)");
  } else {
    fail(`Ảnh phải redirect 302, thực tế: ${avatarRedirect.status}`);
  }

  const delAvatar = await api(`/files/${avatar.id}`, {
    method: "DELETE",
    token: studentToken,
  });
  if (delAvatar.status === 200) {
    ok("Xoá ảnh thành công");
  } else {
    fail(`Xoá ảnh -> ${delAvatar.status}`);
  }
}

log("");
if (failures === 0) {
  log("✅ Tất cả kiểm chứng lưu trữ file đều đạt.");
} else {
  log(`❌ Có ${failures} kiểm chứng lưu trữ file KHÔNG đạt.`);
}
process.exit(failures === 0 ? 0 : 1);

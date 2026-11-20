import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CORSConfiguration;
import software.amazon.awssdk.services.s3.model.CORSRule;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;

import java.net.URI;
import java.util.List;

/**
 * Thiết lập CORS cho bucket R2 — bắt buộc để browser PUT file trực tiếp
 * lên R2 (presigned upload) và GET ảnh công khai.
 *
 * <p>Chạy 1 lần duy nhất sau khi tạo bucket.
 *
 * <p><b>Cần token {@code Admin Read & Write}</b> — token {@code Object Read & Write}
 * bị {@code 403 Access Denied} khi gọi {@code PutBucketCors}.
 *
 * <p>Cách chạy (trong container dev, đã có dependency sẵn):
 * <pre>
 * docker cp backend/scripts/SetupR2Cors.java viejob-backend-dev:/tmp/
 * docker exec viejob-backend-dev sh -c "cd /build &amp;&amp; mvn -B -q dependency:build-classpath -Dmdep.outputFile=/tmp/cp.txt"
 * docker exec viejob-backend-dev sh -c "cd /tmp &amp;&amp; javac -cp \"\$(cat /tmp/cp.txt)\" -d /tmp/classes SetupR2Cors.java \
 *   &amp;&amp; java -cp \"/tmp/classes:\$(cat /tmp/cp.txt)\" SetupR2Cors"
 * </pre>
 *
 * <p>Env cần có: {@code R2_ENDPOINT}, {@code R2_ACCESS_KEY}, {@code R2_SECRET_KEY},
 * {@code R2_BUCKET_PUBLIC}, {@code R2_BUCKET_PRIVATE}.
 */
public class SetupR2Cors {

    public static void main(String[] args) {
        String endpoint = requireEnv("R2_ENDPOINT");
        String accessKey = requireEnv("R2_ACCESS_KEY");
        String secretKey = requireEnv("R2_SECRET_KEY");
        List<String> buckets = List.of(
                requireEnv("R2_BUCKET_PUBLIC"),
                requireEnv("R2_BUCKET_PRIVATE"));

        S3Client s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();

        for (String bucket : buckets) {
            CORSRule rule = CORSRule.builder()
                    .allowedOrigins("http://localhost:5173", "http://localhost:8000",
                            "http://127.0.0.1:5173", "http://127.0.0.1:8000")
                    .allowedMethods("GET", "PUT", "HEAD", "POST")
                    .allowedHeaders("*")
                    .exposeHeaders("ETag")
                    .maxAgeSeconds(3600)
                    .build();

            try {
                s3.putBucketCors(PutBucketCorsRequest.builder()
                        .bucket(bucket)
                        .corsConfiguration(CORSConfiguration.builder()
                                .corsRules(rule)
                                .build())
                        .build());
                System.out.println("[OK] Đã set CORS cho bucket: " + bucket);
            } catch (RuntimeException e) {
                System.out.println("[FAIL] " + bucket + " -> " + e.getMessage());
            }
        }
        s3.close();
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Thiếu biến môi trường: " + name);
        }
        return value.trim();
    }
}

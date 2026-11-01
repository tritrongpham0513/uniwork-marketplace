@echo off
setlocal

set "DIRNAME=%~dp0"
if "%DIRNAME%"=="" set "DIRNAME=."

REM 1. Check MAVEN_HOME
if not "%MAVEN_HOME%"=="" (
    if exist "%MAVEN_HOME%\bin\mvn.cmd" (
        call "%MAVEN_HOME%\bin\mvn.cmd" %*
        exit /b %ERRORLEVEL%
    )
)

REM 2. Check system PATH
for %%i in (mvn.cmd) do (
    if not "%%~$PATH:i"=="" (
        call mvn.cmd %*
        exit /b %ERRORLEVEL%
    )
)

REM 3. Check ~/.m2/wrapper/dists
set "M2_DISTS=%USERPROFILE%\.m2\wrapper\dists"
if exist "%M2_DISTS%" (
    for /r "%M2_DISTS%" %%f in (mvn.cmd) do (
        if exist "%%f" (
            call "%%f" %*
            exit /b %ERRORLEVEL%
        )
    )
)

REM 4. Fallback to Java launcher
if not "%JAVA_HOME%"=="" (
    set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
) else (
    for %%i in (java.exe) do set "JAVA_EXE=%%~$PATH:i"
)

if not exist "%JAVA_EXE%" (
    echo Error: JAVA_HOME is not set and java.exe was not found in PATH.
    exit /b 1
)

set "WRAPPER_JAR=%DIRNAME%\.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

if exist "%WRAPPER_JAR%" (
    "%JAVA_EXE%" %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%DIRNAME%" -classpath "%WRAPPER_JAR%" %WRAPPER_LAUNCHER% %*
    exit /b %ERRORLEVEL%
)

echo Error: Could not find maven-wrapper.jar or a local Maven installation.
exit /b 1

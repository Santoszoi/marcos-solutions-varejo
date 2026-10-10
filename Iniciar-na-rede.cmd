@echo off
if not defined PDV_TLS_CERT goto tls
if not defined PDV_TLS_KEY goto tls
set "PDV_BIND=0.0.0.0"
start "" "%~dp0Marcos Solutions Varejo.exe"
exit /b
:tls
echo Configure PDV_TLS_CERT e PDV_TLS_KEY. Consulte SEGURANCA.md.
pause

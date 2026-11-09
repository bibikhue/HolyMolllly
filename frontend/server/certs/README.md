# 부산 MICE 중간 인증서

원본 사이트가 TLS 중간 인증서를 보내지 않아 공개 CA 인증서만 이 폴더에 보관합니다. Node의 기본 루트 인증서와 함께 사용하며 TLS 검증은 유지합니다. 개인 키는 넣지 않습니다.

원본 인증서의 발급자와 CA Issuers 주소를 확인합니다.

```bash
openssl s_client -connect www.busanmice.or.kr:443 -servername www.busanmice.or.kr -showcerts </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -ext authorityInfoAccess
```

CA Issuers의 공식 주소에서 중간 인증서를 받아 DER이면 PEM으로 변환한 뒤, 주체·발급자·유효기간·SHA-256 지문을 확인합니다. Node 기본 루트 중 하나로 서명이 검증된 공개 CA 파일만 `.pem`으로 추가합니다. `README.md` 등 다른 확장자는 서버가 읽지 않습니다.

```bash
curl -fsSL 'http://secure.globalsign.com/cacert/gsgccr46alphasslca2025.crt' | openssl x509 -inform DER -outform PEM > certs/globalsign-gcc-r46-alphassl-2025.pem
openssl x509 -in certs/globalsign-gcc-r46-alphassl-2025.pem -noout -subject -issuer -dates -fingerprint -sha256
node -e 'const fs=require("node:fs"),tls=require("node:tls"),{X509Certificate}=require("node:crypto"); const ca=new X509Certificate(fs.readFileSync("certs/globalsign-gcc-r46-alphassl-2025.pem")); const ok=ca.ca&&tls.rootCertificates.some(p=>{const root=new X509Certificate(p);return ca.checkIssued(root)&&ca.verify(root.publicKey)}); if(!ok)process.exit(1); console.log("trusted CA")'
```

명령은 `frontend/server/`에서 실행합니다. 원본 서버가 다시 인증서를 바꾸면 새 발급자의 CA Issuers 주소를 확인하고 같은 방식으로 새 PEM 파일을 추가합니다. 기존 파일은 유지합니다.

# React + Vite

## 배포

`HolyMolllly`의 `main`에 반영된 변경은 GitHub Actions가 `frontend/`의 lint, test, build를 검사한 뒤 EC2에 자동 배포합니다. 수동 재배포는 GitHub의 **Actions → Frontend check and deploy → Run workflow**에서 `main`을 선택해 실행합니다. 서버는 `~/holymolly`에 저장소를 부분 체크아웃하며, Nginx는 `/var/www/mapsosa/current`를 제공합니다.

서버 1회 설정 명령은 다음과 같습니다. 서비스 설치, SSH 접근 및 Secrets 설정을 포함한 전체 절차는 [배포 안내](deploy/README.md)를 따릅니다.

```bash
git clone --filter=blob:none --no-checkout https://github.com/bibikhue/HolyMolllly.git ~/holymolly
cd ~/holymolly && git sparse-checkout init --cone && git sparse-checkout set frontend backend && git checkout main
```

Actions Secrets는 `EC2_HOST`(접속 호스트), `EC2_USER`(접속 계정), `EC2_SSH_KEY`(SSH 개인 키)입니다. 값은 저장소에 기록하지 않습니다. 화면을 되돌릴 때는 서버의 `/var/www/mapsosa/current` 링크를 이전 `/var/www/mapsosa/releases/` 디렉터리로 교체합니다. 구체적인 명령은 [배포 안내](deploy/README.md#화면-되돌리기)에 있습니다.

```bash
ls -1dt /var/www/mapsosa/releases/*/
previous_release="/var/www/mapsosa/releases/선택한-release-이름"
sudo ln -sfn "$previous_release" /var/www/mapsosa/current.next
sudo mv -Tf /var/www/mapsosa/current.next /var/www/mapsosa/current
```

전환 전에는 `~/my-app`을 사용하고 내 컴퓨터에서 SSH 한 줄로 배포했습니다. 서버 전환 완료 전까지는 기존 방식을 유지합니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

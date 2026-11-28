import { useEffect, useRef, useState } from "react";
import { login } from "../apis/auth";
import "./Login.css";

function Login({ onClose, onLogin, requireAdmin = true }) {
  const dialogRef = useRef(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const submitLogin = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await login(values.get("username").trim(), values.get("password"));
      if (requireAdmin && data?.user?.role !== "admin") {
        setError("관리자 계정으로만 이용할 수 있습니다.");
        return;
      }
      if (dialogRef.current?.open) onLogin(data.user);
    } catch (error) {
      const message = error.response?.data?.message;
      setError(
        error.response?.status === 401
          ? "아이디 혹은 비밀번호가 틀렸습니다."
          : typeof message === "string" && message
            ? message
            : "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      form.elements.password.value = "";
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="login-modal"
      aria-labelledby="login-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="login-content">
        <button type="button" className="login-close" aria-label="로그인 닫기" onClick={onClose}>×</button>
        <h2 id="login-title">{requireAdmin ? "관리자 로그인" : "로그인"}</h2>
        <p>{requireAdmin ? "해당 페이지는 사이트 관리자만 이용할 수 있습니다." : "행사 기획 상담은 로그인 후 이용할 수 있습니다."}</p>
        <p>계정 발급이 필요하시면 이메일로 문의해 주세요.</p>
        <a href="mailto:admin@example.com">admin@example.com</a>
        <form onSubmit={submitLogin}>
          <label htmlFor="login-id">아이디</label>
          <input id="login-id" name="username" autoComplete="username" required autoFocus />
          <label htmlFor="login-password">비밀번호</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </section>
    </dialog>
  );
}

export default Login;

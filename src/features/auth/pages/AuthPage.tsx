import { useState, type FormEvent } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { ApiError, login } from "../../../api";
import { Button, Field } from "../../../components/ui";
import bazisLogo from "../../../assets/bazis-logo.svg";
import type { User } from "../../../types";
import { registerUser } from "../queries";

function errorText(reason: unknown) {
  return reason instanceof ApiError || reason instanceof Error
    ? reason.message
    : "Request failed";
}

function AuthBrand() {
  return (
    <div className="brand">
      <img src={bazisLogo} alt="Bazis CRM" />
    </div>
  );
}

export function AuthPage({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    try {
      if (mode === "register")
        await registerUser({
          ipName: value("ipName"),
          email: value("email"),
          password: value("password"),
          phone: value("phone"),
          store: {
            name: value("storeName"),
            address: value("address"),
            phone: value("storePhone") || undefined,
          },
        });
      onAuth(await login(value("email"), value("password")));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <AuthBrand />
        <div>
          <span className="eyebrow light">ЦЕНТР ТЕХНИЧЕСКОГО ОБСЛУЖИВАНИЯ</span>
          <h1>Заявки, организации и команда — в одном пространстве.</h1>
          <p>
            БАЗИС CRM объединяет клиентские обращения, отделы, торговые точки и
            защищённые доступы.
          </p>
        </div>
        <div className="auth-proof">
          <span>
            <Check /> Статусы и история
          </span>
          <span>
            <Check /> Права сотрудников
          </span>
          <span>
            <Check /> Telegram готов к подключению
          </span>
        </div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h2>
            {mode === "login" ? "Вход в БАЗИС CRM" : "Регистрация клиента"}
          </h2>
          <p>
            {mode === "login"
              ? "Введите данные учётной записи"
              : "Организация и первая точка будут отправлены на модерацию."}
          </p>
          {mode === "register" && (
            <>
              <Field label="Название организации">
                <input
                  name="ipName"
                  required
                  minLength={2}
                  placeholder="ИП Иванов / ООО Ромашка"
                />
              </Field>
              <div className="form-grid">
                <Field label="Телефон">
                  <input name="phone" required minLength={5} />
                </Field>
                <Field label="Первая точка">
                  <input name="storeName" required minLength={2} />
                </Field>
              </div>
              <Field label="Адрес точки">
                <input name="address" required minLength={5} />
              </Field>
              <Field label="Телефон точки">
                <input name="storePhone" />
              </Field>
            </>
          )}
          <Field label="Email">
            <input name="email" type="email" required />
          </Field>
          <Field label="Пароль">
            <input
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
            />
          </Field>
          {error && (
            <div className="form-error">
              <AlertTriangle />
              {error}
            </div>
          )}
          <Button disabled={busy}>
            {busy && <RefreshCw className="spin" />}
            {mode === "login" ? "Войти" : "Отправить на модерацию"}
          </Button>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "Нет аккаунта? Зарегистрироваться"
              : "Уже есть аккаунт? Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}

import { LoginForm } from "../../components/auth/LoginForm";
export default function LoginPage() {
    return (
        <main className="shell auth-wrap">
            <section className="auth-card">
                <div className="eyebrow">Welcome back</div>
                <h1>
                    Pick up where
                    <br />
                    you left off.
                </h1>
                <p>Sign in to your campaign workspace.</p>
                <LoginForm />
            </section>
        </main>
    );
}

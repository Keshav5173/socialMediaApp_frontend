import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/*
  Auth pages styled in a warm, editorial tone:
  cream background, terracotta accent, serif display type.

  Usage (in your router):
    import { Login, Signup } from "./AuthPages";

    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Signup />} />
    </Routes>

  Tailwind config needs no special setup — only class names from
  the default palette are used, plus a couple of arbitrary values
  for the exact accent color (#D97757) and cream (#F4F1EA).
*/

function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full bg-[#F4F1EA] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm tracking-wide text-[#B0693F] mb-2">{eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#262624] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-[#6B6759]">{subtitle}</p>
          )}
        </div>

        <div className="bg-white border border-[#E8E4DA] rounded-2xl shadow-sm px-8 py-8">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-[#6B6759]">{footer}</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, required = true }) {
  return (
    <label className="block mb-5">
      <span className="block text-sm text-[#44413A] mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[#DEDACD] bg-[#FBFAF6] px-3.5 py-2.5
                   text-[#262624] placeholder-[#A7A296]
                   focus:outline-none focus:ring-2 focus:ring-[#D97757]/40 focus:border-[#D97757]
                   transition-colors"
      />
    </label>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full rounded-lg bg-[#D97757] text-white font-medium py-2.5
                 hover:bg-[#C4643F] active:bg-[#B0552F]
                 focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:ring-offset-2 focus:ring-offset-white
                 transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-[#E8E4DA]" />
      <span className="text-xs text-[#A7A296]">or</span>
      <div className="h-px flex-1 bg-[#E8E4DA]" />
    </div>
  );
}

function GoogleButton({ children }) {
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-[#DEDACD] bg-white text-[#44413A] font-medium py-2.5
                 hover:bg-[#F7F5EF] transition-colors flex items-center justify-center gap-2"
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
      </svg>
      {children}
    </button>
  );
}



import {login, register} from "../services/auth.services.js";
import { ErrorComponent } from "../component/errorComponent.jsx";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const response = await login({ email, password });
      console.log(response);
      navigate("/dashboard");
    } catch (err) {
      const message =
        err.response?.data?.message || "Incorrect email or Username password";
      setError(message);
    }
  }

  return (
    <>
    <ErrorComponent message={error} onClose={() => setError("")} />
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/" className="text-[#D97757] hover:text-[#C4643F] font-medium">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Field
          label="Email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email or username"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="flex items-center justify-between mb-6 text-sm">
          <label className="flex items-center gap-2 text-[#6B6759]">
            <input type="checkbox" className="rounded border-[#DEDACD] text-[#D97757] focus:ring-[#D97757]/40" />
            Remember me
          </label>
          <a href="#" className="text-[#D97757] hover:text-[#C4643F]">Forgot password?</a>
        </div>

        <PrimaryButton type="submit">Log in</PrimaryButton>
      </form>

      
      
    </AuthShell>
    </>

  );
}

export function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const response = await register({ fullName, state, city, username, email, password });
      console.log("signing up", { fullName, username, email, password });
      if(response.data){
        navigate("/dashboard");
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Something went wrong. Please try again.";
      setError(message);
    }
  }

  return (
    <>    
    <ErrorComponent message={error} onClose={() => setError("")} />
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Takes less than a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-[#D97757] hover:text-[#C4643F] font-medium">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Field
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jordan Lee"
        />
        <Field
          label="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Chhattisgarh"
        />
        <Field
          label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Raipur"
        />
        <Field
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        <p className="text-xs text-[#A7A296] mb-6 leading-relaxed">
          By creating an account, you agree to our{" "}
          <a href="#" className="underline hover:text-[#6B6759]">Terms</a> and{" "}
          <a href="#" className="underline hover:text-[#6B6759]">Privacy Policy</a>.
        </p>

        <PrimaryButton type="submit">Create account</PrimaryButton>
      </form>

      
    </AuthShell>
    </>

  );
}

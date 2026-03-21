/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { getDefaultRoute, getSession, hasValidSession, saveSession } from "@/lib/session";
import type { LoginResponse } from "@/types/session";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const session = getSession();

    if (hasValidSession(session)) {
      router.replace(getDefaultRoute(session));
    }
  }, [router]);

  return (
    <div className="app-wrapper d-block">
      <main className="w-100 p-0">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 p-0">
              <div className="login-form-container">
                <div className="mb-4">
                  <Link className="logo" href="/">
                    <img alt="logo" src="/assets/images/logo/3.png" />
                  </Link>
                </div>
                <div className="form_container">
                  <form
                    className="app-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setError("");

                      const formData = new FormData(event.currentTarget);
                      const login = String(formData.get("login") || "").trim();
                      const password = String(formData.get("password") || "");

                      startTransition(async () => {
                        try {
                          const response = await apiRequest<LoginResponse>("auth/login", {
                            method: "POST",
                            body: { login, password },
                          });

                          saveSession({
                            user: response.data.user || null,
                            church: response.data.church || null,
                            branch: response.data.branch || null,
                            homecell: response.data.homecell || null,
                            homecell_leader: response.data.homecell_leader || null,
                          });

                          router.replace(getDefaultRoute(response.data));
                        } catch (nextError) {
                          setError(
                            nextError instanceof Error ? nextError.message : "Unable to sign in right now.",
                          );
                        }
                      });
                    }}
                  >
                    <div className="mb-3 text-center">
                      <h3>Login to Church Management</h3>
                      <p className="f-s-12 text-secondary">
                        Use email address or phone number to access the admin workspace.
                      </p>
                    </div>
                    <div
                      className={`alert alert-danger ${error ? "" : "d-none"}`}
                      role="alert"
                    >
                      {error}
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="loginId">
                        Email or Phone Number
                      </label>
                      <input
                        className="form-control"
                        id="loginId"
                        name="login"
                        placeholder="admin@church.org or +234..."
                        type="text"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="loginPassword">
                        Password
                      </label>
                      <div className="position-relative">
                        <input
                          className="form-control"
                          id="loginPassword"
                          name="password"
                          placeholder="Enter password"
                          style={{ paddingRight: "2.75rem" }}
                          type={showPassword ? "text" : "password"}
                        />
                        <button
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-0 text-secondary"
                          onClick={() => setShowPassword((value) => !value)}
                          type="button"
                        >
                          <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                        </button>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="form-check">
                        <input className="form-check-input" id="rememberMe" type="checkbox" />
                        <label className="form-check-label" htmlFor="rememberMe">
                          Remember me
                        </label>
                      </div>
                      <a className="text-primary text-decoration-underline" href="#">
                        Forgot Password
                      </a>
                    </div>
                    <div>
                      <button className="btn btn-primary w-100" disabled={isPending} type="submit">
                        {isPending ? "Signing in..." : "Continue"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

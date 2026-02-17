"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthProvider"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { EyeIcon, EyeCloseIcon } from "@/icons"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error: authError } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!username || !password) {
      setError("Username dan password harus diisi");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    // Call login dari auth context
    const result = await login(username, password);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-10 text-white relative">
        <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10 mix-blend-overlay"></div>
        <div className="z-10 flex flex-row items-center gap-4">
            <div className="relative w-16 h-16 shrink-0 drop-shadow-lg"> 
                <Image src="/images/logo/humas.png" alt="Logo Polresta" fill className="object-contain" priority              
                />
            </div>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              Humas Polresta Banyuwangi
            </h1>
        </div>
        <div className="mb-20">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Sistem Integrasi Humas Polresta Banyuwangi (B-PRIS) : Transformasi Digital Humas Polresta Banyuwangi dalam mengelola informasi kehumasan dengan cepat, akurat, dan terintegrasi demi mendukung Polri yang Presisi.&rdquo;
            </p>
            <footer className="text-sm text-slate-400">Sihumas Polresta Banyuwangi</footer>
          </blockquote>
        </div>

        <div className="text-xs text-slate-500">
          © 2026 Polresta Banyuwangi Public Relation Integration System. Secure Connection.
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md space-y-6">
            
          {/* Header Mobile (Logo muncul di atas kalau di HP) */}
          <div className="flex flex-col items-center text-center space-y-2 lg:items-start lg:text-left">
            <div className="lg:hidden w-12 h-12 flex items-center justify-center font-bold text-slate-900 text-xl mb-4">
              <div className="flex flex-col justify-center relative w-16 h-16 shrink-0 drop-shadow-lg"> 
                    <Image src="/images/logo/humas.png" alt="Logo Polresta" fill className="object-contain" priority              
                    />
                </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Selamat Datang</h1>
            <p className="text-slate-500 text-sm">Masuk untuk mengakses Dashboard B-PRIS.</p>
          </div>

          <Card className="border-none shadow-none bg-transparent lg:bg-white lg:shadow-sm lg:border lg:p-2">
            <CardHeader className="px-0 lg:px-6">
            </CardHeader>
            <CardContent className="px-0 lg:px-6 space-y-4">
              {/* Error Message */}
              {(error || authError) && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error || authError}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="Masukkan Username anda" type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-xs text-blue-600 hover:underline">
                        Lupa password?
                    </Link>
                </div>

                <div className="relative">
                  <Input id="password" placeholder="••••••••" type={showPassword ? "text" : "password"} value={password}onChange={(e) => setPassword(e.target.value)}disabled={isLoading} />
                   <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    disabled={isLoading}
                    >
                    {showPassword ? (
                      <EyeCloseIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white" size="lg" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="animate-spin inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Loading...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </Button>

            </CardContent>
            
            <CardFooter className="px-0 lg:px-6">
                <p className="text-xs text-center text-slate-500 w-full">
                    Hubungi admin jika belum memiliki akun akses.
                </p>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  )
}
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      
      {/* BAGIAN KIRI: BRANDING (Hanya muncul di layar besar) */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-10 text-white relative">
        <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10 mix-blend-overlay"></div>
        <div className="z-10 flex flex-row items-center gap-5">
            <div className="flex flex-col justify-center relative w-16 h-16 shrink-0 drop-shadow-lg"> 
                <Image src="/humas.png" alt="Logo Polresta" fill className="object-contain" priority              
                />
            </div>
            <div className="flex flex-col justify-center text-left">
             <h1 className="text-2xl font-bold tracking-wide text-white leading-none ">
               Humas Polresta Banyuwangi
             </h1>
           </div>
        </div>
        
        <div className="mb-20">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Sistem Integrasi Humas Polresta Banyuwangi (B-PRIS) mempercepat rekapitulasi  digital dan pemantauan media secara real-time demi mewujudkan Polri yang Presisi.&rdquo;
            </p>
            <footer className="text-sm text-slate-400">SIHUMAS Polresta Banyuwangi</footer>
          </blockquote>
        </div>

        <div className="text-xs text-slate-500">
          © 2026 B-LINK Integrated System. Secure Connection.
        </div>
      </div>

      {/* BAGIAN KANAN: FORM LOGIN */}
      <div className="flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md space-y-6">
            
          {/* Header Mobile (Logo muncul di atas kalau di HP) */}
          <div className="flex flex-col items-center text-center space-y-2 lg:items-start lg:text-left">
            <div className="lg:hidden w-12 h-12 flex items-center justify-center font-bold text-slate-900 text-xl mb-4">
              <div className="flex flex-col justify-center relative w-16 h-16 shrink-0 drop-shadow-lg"> 
                    <Image src="/humas.png" alt="Logo Polresta" fill className="object-contain" priority              
                    />
                </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Selamat Datang</h1>
            <p className="text-slate-500 text-sm">Masuk untuk mengakses Dashboard B-LINK.</p>
          </div>

          {/* Form Container */}
          <Card className="border-none shadow-none bg-transparent lg:bg-white lg:shadow-sm lg:border lg:p-2">
            <CardHeader className="px-0 lg:px-6">
              {/* Kosongkan header card karena judul sudah di luar */}
            </CardHeader>
            <CardContent className="px-0 lg:px-6 space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="nrp">NRP / Username</Label>
                <Input id="nrp" placeholder="Masukkan NRP anda" type="text" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-xs text-blue-600 hover:underline">
                        Lupa password?
                    </Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>

              <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white" size="lg">
                Masuk ke Dashboard
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
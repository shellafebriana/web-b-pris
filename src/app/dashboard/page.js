import prisma from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default async function Dashboard() {
  // Ambil data (Logika Backend)
  const dataLaporan = await prisma.rekapSession.findMany({
    take: 10, // Ambil 10 aja biar ga kepanjangan
    include: { links: true, operator: true },
    orderBy: { createdAt: 'desc' }
  });

  // Hitung Statistik
  const totalLaporan = await prisma.rekapSession.count();
  const totalLink = await prisma.link.count();

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">B-LINK Dashboard</h1>
          <p className="text-slate-500">Sistem Integrasi Humas Polresta Banyuwangi</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md font-medium text-sm">
             Halo, Admin
           </div>
        </div>
      </div>

      {/* STATISTIK CARDS */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan Masuk</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-slate-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLaporan}</div>
            <p className="text-xs text-slate-500">+12% dari bulan lalu</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Link Terkumpul</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-slate-500"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLink}</div>
            <p className="text-xs text-slate-500">Berita Online & Sosmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Server</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-green-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-slate-500">Bot WhatsApp Aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* TABEL DATA */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Rekapitulasi Terkini</CardTitle>
          <CardDescription>
            Daftar input link terbaru dari operator lapangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Jumlah Link</TableHead>
                <TableHead className="text-right">Format</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataLaporan.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">#{item.id}</TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.operator?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{item.operatorId}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {item.links.length} Link
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{item.formatId}</TableCell>
                </TableRow>
              ))}
              {dataLaporan.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        Belum ada data masuk.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
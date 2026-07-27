function MetaCard({ label, value, hint, valueClass = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 text-xs font-medium text-gray-400">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  )
}

export default function SessionMetaCards({ metaCounts, totalLinks }) {
  if (metaCounts.type === 'unit') {
    const { collected, notCollected } = metaCounts
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetaCard label="Total link" value={totalLinks} hint="dari semua unit" />
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-400">
            Sudah mengumpulkan <span className="text-success-600 dark:text-success-400">({collected.length})</span>
          </p>
          <div className="max-h-32 space-y-1.5 overflow-y-auto">
            {collected.length === 0 ? (
              <p className="text-xs italic text-gray-400">Belum ada</p>
            ) : (
              collected.map((u) => (
                <div key={u.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-gray-700 dark:text-gray-300">{u.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">{u.count} link</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-2 text-xs font-medium text-gray-400">
            Belum mengumpulkan <span className="text-error-500 dark:text-error-400">({notCollected.length})</span>
          </p>
          <div className="max-h-32 space-y-1.5 overflow-y-auto">
            {notCollected.length === 0 ? (
              <p className="text-xs text-success-600 dark:text-success-400">Semua unit sudah kumpul</p>
            ) : (
              notCollected.map((u) => (
                <span key={u.id} className="block truncate text-xs text-gray-700 dark:text-gray-300">{u.name}</span>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  if (metaCounts.type === 'platform') {
    const { byPlatform } = metaCounts
    const maxCount = Math.max(...byPlatform.map((p) => p.count), 1)
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetaCard label="Total link" value={totalLinks} hint={`${byPlatform.length} platform`} />
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-xs font-medium text-gray-400">Breakdown platform</p>
          <div className="space-y-2">
            {byPlatform.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-gray-700 dark:text-gray-300">{name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MetaCard label="Total link" value={totalLinks} hint="siap di-generate" />
      <MetaCard
        label="Link prioritas"
        value={metaCounts.priorityCount || 0}
        hint="akan diurutkan paling atas"
        valueClass="text-amber-600 dark:text-amber-400"
      />
    </div>
  )
}
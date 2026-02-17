"use client";
import React from "react";
import { DownloadIcon, DocsIcon, MobilePhoneIcon, GlobeIcon} from "@/icons";
import { formatNumber } from '@/lib/format-number'

const DashboardCard = ({data}) => {
  const cards = [
    {
      id: 1,
      title: 'Rekap Sesi Hari Ini',
      value: data?.totalSesi || 0,
      icon: 'DocsIcon',
    },
    {
      id: 2,
      title: 'Amplifikasi Media Sosial Hari Ini',
      value: data?.totalLinkSosmed || 0,
      icon: 'MobilePhoneIcon',
    },
    {
      id: 3,
      title: 'Ampifikasi Media Online Hari Ini',
      value: data?.totalLinkOnline || 0,
      icon: 'GlobeIcon',
    },
    {
      id: 4,
      title: 'Total Link Amplifikasi Bulan Ini',
      value: data?.totalLinkAllFormat || 0,
      icon: 'DownloadIcon',
    }
  ]


  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
      {cards.map((card) => (
        <div key={card.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {card.icon === 'DocsIcon' && <DocsIcon className="text-gray-800 size-6 dark:text-white" />}
            {card.icon === 'MobilePhoneIcon' && <MobilePhoneIcon className="text-gray-800 size-6 dark:text-white" />}
            {card.icon === 'GlobeIcon' && <GlobeIcon className="text-gray-800 size-6 dark:text-white" />}
            {card.icon === 'DownloadIcon' && <DownloadIcon className="text-gray-800 size-6 dark:text-white" />}
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {card.title}
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white">
                {formatNumber(card.value)}
              </h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCard;
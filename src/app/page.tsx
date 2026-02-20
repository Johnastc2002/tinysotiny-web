import BubbleScene from '@/components/BubbleScene';
import { getAppConfig } from '@/lib/contentful';
import { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#efefef',
  viewportFit: 'cover',
};

export default async function Home() {
  const appConfig = await getAppConfig();

  return (
    <main className="w-full min-h-[100dvh] overflow-hidden bg-[#efefef]">
      <BubbleScene
        mode="home"
        enableBlur={false}
        enableRefraction={true}
        showPlayGrid={appConfig?.show_play_grid}
      />
    </main>
  );
}

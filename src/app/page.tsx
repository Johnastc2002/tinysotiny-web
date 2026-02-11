import BubbleScene from '@/components/BubbleScene';
import { getAppConfig } from '@/lib/contentful';
import { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#efefef',
};

export default async function Home() {
  const appConfig = await getAppConfig();

  return (
    <main className="w-full h-full overflow-hidden bg-[#efefef]">
      <BubbleScene
        mode="home"
        enableBlur={false}
        enableRefraction={true}
        showPlayGrid={appConfig?.show_play_grid}
      />
    </main>
  );
}

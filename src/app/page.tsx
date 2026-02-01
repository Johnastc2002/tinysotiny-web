import BubbleScene from '@/components/BubbleScene';
import { getAppConfig } from '@/lib/contentful';

export default async function Home() {
  const appConfig = await getAppConfig();

  return (
    <main className="w-full h-screen overflow-hidden">
      <BubbleScene
        mode="home"
        enableBlur={false}
        enableRefraction={true}
        showPlayGrid={appConfig?.show_play_grid}
      />
    </main>
  );
}

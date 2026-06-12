import BubbleScene from '@/components/BubbleScene';
import { getAppConfig } from '@/lib/contentful';
export const revalidate = 300; // Revalidate every 5 minutes

// theme-color is managed client-side by ThemeColorManager (single owner);
// viewport-fit=cover comes from the root layout's viewport export.

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

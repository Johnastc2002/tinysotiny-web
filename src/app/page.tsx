import BubbleScene from '@/components/BubbleScene';

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <BubbleScene mode="home" enableBlur={false} />
    </main>
  );
}

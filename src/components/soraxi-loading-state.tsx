export default function SoraxiLoadingState({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-soraxi-green"></div>
      {text && <p>{text}</p>}
    </div>
  );
}

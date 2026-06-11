export default function Toast({ message }: { message: string }) {
  return (
    <div
      data-testid="toast-error"
      className="bg-ink text-paper rounded-lg px-4 py-3 text-[13.5px] shadow-pop inline-flex items-center gap-3"
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-danger-500" />
      <span>{message}</span>
    </div>
  );
}

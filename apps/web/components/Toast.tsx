export default function Toast({ message }: { message: string }) {
  return (
    <div
      data-testid="toast-error"
      className="bg-[#f6e2da] border border-[#e0ab9b] text-[#8a3b2a] px-4 py-3 rounded-xl text-sm"
    >
      {message}
    </div>
  );
}

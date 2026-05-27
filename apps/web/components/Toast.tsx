export default function Toast({ message }: { message: string }) {
  return (
    <div
      data-testid="toast-error"
      className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-sm"
    >
      {message}
    </div>
  );
}

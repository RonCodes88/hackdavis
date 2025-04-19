export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"
        aria-label="Loading"
      ></div>
    </div>
  );
}

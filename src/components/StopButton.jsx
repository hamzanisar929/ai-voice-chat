export default function StopButton({ onClick, isVisible }) {
  if (!isVisible) return null;

  return (
    <button
      className={`
        w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-200 ease-in-out
        bg-red-500 hover:bg-red-600
        shadow-lg hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
        ml-4
      `}
      onClick={onClick}
    >
      <svg
        className="w-6 h-6 text-white"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="6" y="6" width="12" height="12" />
      </svg>
    </button>
  )
} 
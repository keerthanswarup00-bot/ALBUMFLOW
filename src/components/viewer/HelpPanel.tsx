import { X, MoveHorizontal, RotateCw, ZoomIn, MessageSquare, CheckSquare } from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpItems = [
  {
    icon: MoveHorizontal,
    title: 'How To View Album',
    description: 'Swipe left or right to move between pages. You can also use the arrow buttons at the bottom of the screen.',
  },
  {
    icon: ZoomIn,
    title: 'How To Zoom',
    description: 'Pinch with two fingers to zoom in and out. Double-tap to zoom in quickly. Use the mouse scroll wheel on desktop. Drag to pan around when zoomed.',
  },
  {
    icon: RotateCw,
    title: 'How To Rotate Your Phone',
    description: 'Rotate your phone sideways to see two pages side by side, just like a real album. You can also tap the layout button to switch manually.',
  },
  {
    icon: MessageSquare,
    title: 'How To Request Changes',
    description: 'Tap the "Request Changes" button and describe what you would like updated. Your designer will review and make the changes.',
  },
  {
    icon: CheckSquare,
    title: 'How To Approve Your Album',
    description: 'Once everything looks perfect, tap "Approve Album" to give your final approval. Your designer will be notified right away.',
  },
];

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white sm:rounded-2xl max-h-[80dvh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Help</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {helpItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Icon className="h-4 w-4 text-blue-600" />
                </span>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { X, MoveHorizontal, RotateCw, ZoomIn, MessageSquare, CheckSquare } from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpItems = [
  {
    icon: MoveHorizontal,
    title: 'How To View Album',
    description: 'Swipe left or right to move between spreads. You can also use the arrow buttons at the bottom of the screen.',
  },
  {
    icon: ZoomIn,
    title: 'How To Zoom',
    description: 'Pinch with two fingers to zoom in and out. Double-tap to zoom in quickly. Use the mouse scroll wheel on desktop. Drag to pan around when zoomed.',
  },
  {
    icon: RotateCw,
    title: 'How To Rotate Your Phone',
    description: 'This spread view shows both pages of the album side by side. The center line is the album spine.',
  },
  {
    icon: MessageSquare,
    title: 'How To Request Changes',
    description: 'Tap the "Comment" button and describe what you would like updated. Your designer will review and make the changes.',
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
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Help</h2>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {helpItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-600" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-0.5 text-base text-gray-600">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { memo, type ReactNode } from 'react';
import {
  Edit,
  Check,
  Armchair,
  CheckCircle,
  XCircle,
  Ban,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Reservation } from '@/types/models';

interface ReservationContextMenuProps {
  children: ReactNode;
  reservation: Reservation;
  onEdit: () => void;
  onConfirm: () => void;
  onSeat: () => void;
  onFinish: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const ReservationContextMenu = memo(function ReservationContextMenu({
  children,
  reservation,
  onEdit,
  onConfirm,
  onSeat,
  onFinish,
  onNoShow,
  onCancel,
  onDuplicate,
  onDelete,
}: ReservationContextMenuProps) {
  const { status } = reservation;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Edit className="h-4 w-4 text-[rgb(255,147,67)]" />
          Edit details
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Check className="h-4 w-4 text-[rgb(255,147,67)]" />
            Change status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={onConfirm}
              disabled={status === 'CONFIRMED'}
              className="gap-2"
            >
              <Check className="h-4 w-4 text-blue-500" />
              Confirm
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onSeat}
              disabled={status === 'SEATED'}
              className="gap-2"
            >
              <Armchair className="h-4 w-4 text-green-500" />
              Mark as seated
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onFinish}
              disabled={status === 'FINISHED'}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4 text-gray-500" />
              Mark as finished
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem
          onClick={onNoShow}
          disabled={status === 'NO_SHOW'}
          className="gap-2"
        >
          <XCircle className="h-4 w-4 text-red-500" />
          Mark as no-show
        </ContextMenuItem>

        <ContextMenuItem
          onClick={onCancel}
          disabled={status === 'CANCELLED'}
          className="gap-2"
        >
          <Ban className="h-4 w-4 text-gray-500" />
          Cancel reservation
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDuplicate} className="gap-2">
          <Copy className="h-4 w-4 text-[rgb(255,147,67)]" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={onDelete}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

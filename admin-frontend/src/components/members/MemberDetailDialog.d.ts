import { FC } from 'react';
import { Member } from '../../types/member.types';

interface MemberDetailDialogProps {
  open: boolean;
  member: Member;
  onClose: () => void;
  onEdit: () => void;
}

declare const MemberDetailDialog: FC<MemberDetailDialogProps>;
export default MemberDetailDialog;

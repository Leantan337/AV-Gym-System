import { FC } from 'react';
import { Member } from '../../types/member.types';

interface MemberFormProps {
  open: boolean;
  member: Member | null;
  onClose: (refreshData?: boolean) => void;
}

declare const MemberForm: FC<MemberFormProps>;
export default MemberForm;

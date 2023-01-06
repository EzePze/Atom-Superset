import React from 'react';
import { User } from 'src/types/bootstrapTypes';
import withToasts from 'src/components/MessageToasts/withToasts';
import UserWelcome from './UserWelcome';
import PublicWelcome from './PublicWelcome';

interface WelcomeProps {
  user: User;
  addDangerToast: (arg0: string) => void;
}

function Welcome({ user, addDangerToast }: WelcomeProps) {
  return (
    <div>
      {user?.userId ? (
        <UserWelcome user={user} addDangerToast={addDangerToast} />
      ) : (
        <PublicWelcome user={user} addDangerToast={addDangerToast} />
      )}
    </div>
  );
}

export default withToasts(Welcome);

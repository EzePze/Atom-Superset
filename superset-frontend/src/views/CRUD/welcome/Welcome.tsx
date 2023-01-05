import React from 'react';
import { User } from 'src/types/bootstrapTypes';
import UserWelcome from './UserWelcome';
import PublicWelcome from './PublicWelcome';

interface WelcomeProps {
  user: User;
  addDangerToast: (arg0: string) => void;
}

export default function Welcome({ user, addDangerToast }: WelcomeProps) {
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

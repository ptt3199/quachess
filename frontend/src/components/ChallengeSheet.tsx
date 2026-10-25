import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useToast } from './ui/Toast';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { FormField, fieldControlClass } from './ui/FormField';
import { SegmentedControl } from './ui/SegmentedControl';
import { StatusMessage } from './ui/StatusMessage';
import type { GameType } from '../types';

interface ChallengeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: number;
  receiverName: string;
}

const gameTypeOptions = [
  { value: 'RAPID' as GameType, label: 'Rapid' },
  { value: 'BLITZ' as GameType, label: 'Blitz' },
  { value: 'CLASSICAL' as GameType, label: 'Classical' },
];

const colorOptions = [
  { value: 'WHITE' as const, label: '⚪ White' },
  { value: 'BLACK' as const, label: '⚫ Black' },
  { value: 'RANDOM' as const, label: '🎲 Random' },
];

export function ChallengeSheet({ isOpen, onClose, receiverId, receiverName }: ChallengeSheetProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [gameType, setGameType] = useState<GameType>('RAPID');
  const [color, setColor] = useState<'WHITE' | 'BLACK' | 'RANDOM'>('RANDOM');
  const [scheduledAt, setScheduledAt] = useState('');

  const sendMutation = useMutation({
    mutationFn: () =>
      api.createChallenge({
        receiver_id: receiverId,
        game_type: gameType,
        sender_color: color,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast(`Challenge sent to ${receiverName}`, 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.challengesSent });
      setScheduledAt('');
      onClose();
    },
  });

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Challenge ${receiverName}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMutation.mutate();
        }}
        className="space-y-4"
      >
        <SegmentedControl
          ariaLabel="Game type"
          options={gameTypeOptions}
          value={gameType}
          onChange={setGameType}
          className="w-full"
        />

        <SegmentedControl
          ariaLabel="Your color"
          options={colorOptions}
          value={color}
          onChange={setColor}
          className="w-full"
        />

        <FormField id="challenge-scheduled-at" label="When (optional)" hint="Leave empty to play whenever you meet.">
          <input
            id="challenge-scheduled-at"
            type="datetime-local"
            autoComplete="off"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={`${fieldControlClass} [color-scheme:dark]`}
          />
        </FormField>

        {sendMutation.isError && (
          <StatusMessage type="error" message={(sendMutation.error as Error).message} />
        )}

        <Button type="submit" fullWidth size="lg" loading={sendMutation.isPending}>
          Send challenge
        </Button>
      </form>
    </BottomSheet>
  );
}

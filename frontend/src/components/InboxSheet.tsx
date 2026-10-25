import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useToast } from './ui/Toast';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import { LoadingState } from './ui/LoadingState';
import { StatusMessage } from './ui/StatusMessage';

interface InboxSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InboxSheet({ isOpen, onClose }: InboxSheetProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const challengesQuery = useQuery({
    queryKey: queryKeys.challengesReceived,
    queryFn: api.getChallengesReceived,
    enabled: isOpen,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.challengesReceived });
    void queryClient.invalidateQueries({ queryKey: queryKeys.challengesSent });
    void queryClient.invalidateQueries({ queryKey: queryKeys.matchesUpcoming });
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
  };

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.acceptChallenge(id),
    onSuccess: (challenge) => {
      toast(`Challenge from ${challenge.sender_name} accepted`, 'success');
      invalidate();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => api.declineChallenge(id),
    onSuccess: () => {
      toast('Challenge declined', 'info');
      invalidate();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const challenges = challengesQuery.data ?? [];
  const busy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Invitations" subtitle={challenges.length > 0 ? `${challenges.length} pending` : undefined}>
      {challengesQuery.isLoading ? (
        <LoadingState label="Loading invitations…" />
      ) : challengesQuery.isError ? (
        <StatusMessage type="error" message={(challengesQuery.error as Error).message} />
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-5 h-5" />}
          title="No pending invitations"
          hint="When someone challenges you, it shows up here."
        />
      ) : (
        <div className="space-y-2.5">
          {challenges.map((c) => (
            <div key={c.id} className="p-3.5 rounded-2xl bg-night-700 border border-line">
              <div className="flex items-center gap-3">
                <Avatar name={c.sender_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{c.sender_name}</p>
                  <p className="text-[11px] text-slate-400">
                    wants to play <span className="font-bold text-brass-300">{c.game_type}</span>
                    {' · '}
                    plays {c.sender_color === 'WHITE' ? 'White' : 'Black'}
                  </p>
                </div>
                {c.scheduled_at && <Chip variant="outline">Scheduled</Chip>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={busy}
                  loading={declineMutation.isPending && declineMutation.variables === c.id}
                  onClick={() => declineMutation.mutate(c.id)}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  fullWidth
                  disabled={busy}
                  loading={acceptMutation.isPending && acceptMutation.variables === c.id}
                  onClick={() => acceptMutation.mutate(c.id)}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

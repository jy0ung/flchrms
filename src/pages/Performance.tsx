import { useMyReviews, useAcknowledgeReview } from '@/hooks/usePerformance';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ClipboardCheck, MessageSquareWarning, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AppPageContainer, CardHeaderStandard, DataTableShell, PageHeader, StatusBadge } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

export default function Performance() {
  usePageTitle('Performance');
  const { data: reviews, isLoading } = useMyReviews();
  const acknowledge = useAcknowledgeReview();
  const pendingAcknowledgement = reviews?.filter((review) => review.status === 'submitted').length ?? 0;
  const ratedReviews = reviews?.filter((review) => typeof review.overall_rating === 'number') ?? [];
  const averageRating = ratedReviews.length > 0
    ? (ratedReviews.reduce((total, review) => total + (review.overall_rating ?? 0), 0) / ratedReviews.length).toFixed(1)
    : '—';

  return (
    <AppPageContainer maxWidth="7xl">
      <PageHeader
        title="Performance Reviews"
        description="Performance evaluation records and status."
      />

      {!isLoading ? (
        <SummaryRail
          items={[
            {
              id: 'review-count',
              label: 'Reviews',
              value: reviews?.length ?? 0,
              helper: 'Current and past review cycles on file.',
              icon: ClipboardCheck,
            },
            {
              id: 'pending-acknowledgement',
              label: 'Awaiting Acknowledgement',
              value: pendingAcknowledgement,
              helper: pendingAcknowledgement > 0 ? 'Reviews that still need your acknowledgement.' : 'No acknowledgement action pending.',
              icon: MessageSquareWarning,
              tone: pendingAcknowledgement > 0 ? 'warning' : 'default',
            },
            {
              id: 'average-rating',
              label: 'Average Rating',
              value: averageRating,
              helper: ratedReviews.length > 0 ? 'Average across completed rated reviews.' : 'No ratings available yet.',
              icon: Star,
              tone: ratedReviews.length > 0 ? 'info' : 'default',
            },
          ]}
        />
      ) : null}

      <DataTableShell
        title="My Reviews"
        description="Current and past performance evaluations."
        loading={isLoading}
        hasData={Boolean(reviews?.length)}
        loadingSkeleton={
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        }
        emptyState={
          <WorkspaceStatePanel
            title="No performance reviews yet"
            description="Review cycles will appear here once they are submitted or assigned."
            icon={ClipboardCheck}
          />
        }
        content={
          <div className="grid gap-4">
            {reviews?.map((review) => (
              <Card key={review.id} className="border-border shadow-sm">
                <CardHeaderStandard
                  title={review.review_period}
                  description={`Reviewer ${review.reviewer?.first_name ?? ''} ${review.reviewer?.last_name ?? ''}`.trim()}
                  actions={(
                    <StatusBadge
                      status={review.status}
                      labelOverride={review.status.replace('_', ' ')}
                      className="self-start"
                    />
                  )}
                  className="p-4 pb-2"
                />
                <CardContent className="space-y-4">
                  {review.overall_rating && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="text-sm font-medium">Rating:</span>
                      <div className="flex flex-wrap">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-5 w-5 ${i < review.overall_rating! ? 'fill-warning text-warning' : 'text-muted'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {review.strengths && (
                    <div>
                      <p className="text-sm font-medium">Strengths</p>
                      <p className="text-sm text-muted-foreground">{review.strengths}</p>
                    </div>
                  )}
                  {review.areas_for_improvement && (
                    <div>
                      <p className="text-sm font-medium">Areas for Improvement</p>
                      <p className="text-sm text-muted-foreground">{review.areas_for_improvement}</p>
                    </div>
                  )}
                  {review.goals && (
                    <div>
                      <p className="text-sm font-medium">Goals</p>
                      <p className="text-sm text-muted-foreground">{review.goals}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {review.submitted_at && `Submitted: ${format(new Date(review.submitted_at), 'MMM d, yyyy')}`}
                    </p>
                    {review.status === 'submitted' && (
                      <Button size="sm" className="w-full rounded-full sm:w-auto" onClick={() => acknowledge.mutate(review.id)}>
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      />
    </AppPageContainer>
  );
}

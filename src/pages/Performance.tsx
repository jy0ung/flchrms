import { useMyReviews, useAcknowledgeReview } from '@/hooks/usePerformance';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { AppPageContainer, CardHeaderStandard, DataTableShell, PageHeader, StatusBadge } from '@/components/system';

export default function Performance() {
  usePageTitle('Performance');
  const { data: reviews, isLoading } = useMyReviews();
  const acknowledge = useAcknowledgeReview();

  return (
    <AppPageContainer>
      <PageHeader
        title="Performance Reviews"
        description="Performance evaluation records and status."
      />

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
          <div className="py-12 text-center text-muted-foreground">
            No performance reviews yet
          </div>
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

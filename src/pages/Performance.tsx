import { useMyReviews, useAcknowledgeReview } from '@/hooks/usePerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Star } from 'lucide-react';
import { format } from 'date-fns';

export default function Performance() {
  const { data: reviews, isLoading } = useMyReviews();
  const acknowledge = useAcknowledgeReview();

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'badge-info',
    acknowledged: 'badge-success',
  };

  return (
    <div className="space-y-6">
      <Card className="card-stat border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Performance
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-accent" />
                Performance Reviews
              </h1>
              <p className="text-muted-foreground mt-1">Your performance evaluations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : reviews?.length === 0 ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No performance reviews yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reviews?.map(review => (
            <Card key={review.id} className="card-stat border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle>{review.review_period}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reviewed by {review.reviewer?.first_name} {review.reviewer?.last_name}
                    </p>
                  </div>
                  <Badge className={`${statusColors[review.status]} self-start`}>{review.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.overall_rating && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex flex-wrap">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-5 h-5 ${i < review.overall_rating! ? 'text-warning fill-warning' : 'text-muted'}`} />
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
                <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {review.submitted_at && `Submitted: ${format(new Date(review.submitted_at), 'MMM d, yyyy')}`}
                  </p>
                  {review.status === 'submitted' && (
                    <Button size="sm" className="rounded-full w-full sm:w-auto" onClick={() => acknowledge.mutate(review.id)}>
                      Acknowledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

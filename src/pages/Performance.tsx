import { useMyReviews, useAcknowledgeReview } from '@/hooks/usePerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-accent" />
          Performance Reviews
        </h1>
        <p className="text-muted-foreground mt-1">Your performance evaluations</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : reviews?.length === 0 ? (
        <Card className="card-stat">
          <CardContent className="py-12 text-center text-muted-foreground">
            No performance reviews yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reviews?.map(review => (
            <Card key={review.id} className="card-stat">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{review.review_period}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reviewed by {review.reviewer?.first_name} {review.reviewer?.last_name}
                    </p>
                  </div>
                  <Badge className={statusColors[review.status]}>{review.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.overall_rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rating:</span>
                    <div className="flex">
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
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {review.submitted_at && `Submitted: ${format(new Date(review.submitted_at), 'MMM d, yyyy')}`}
                  </p>
                  {review.status === 'submitted' && (
                    <Button size="sm" onClick={() => acknowledge.mutate(review.id)}>
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

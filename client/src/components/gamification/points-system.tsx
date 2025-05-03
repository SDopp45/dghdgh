import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export function PointsSystem() {
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelPoints, setNextLevelPoints] = useState(100);

  // Calculate points based on various activities
  useEffect(() => {
    let totalPoints = 0;

    // Points for properties
    totalPoints += properties.length * 50;

    // Points for rented properties
    const rentedProperties = properties.filter(p => p.status === "rented").length;
    totalPoints += rentedProperties * 25;

    // Set points and calculate level
    setPoints(totalPoints);
    const newLevel = Math.floor(totalPoints / 100) + 1;
    setLevel(newLevel);
    setNextLevelPoints((newLevel * 100));
  }, [properties]);

  const progressToNextLevel = ((points % 100) / 100) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold">{level}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Niveau {level}</h4>
              <div className="mt-2">
                <Progress value={progressToNextLevel} />
                <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                  <span>{points} points</span>
                  <span>{nextLevelPoints} points</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Star className="h-4 w-4" />
              Points disponibles
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 border rounded">
                <span>Nouvelle propriété</span>
                <span className="font-semibold">50 points</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span>Location réussie</span>
                <span className="font-semibold">25 points</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span>Maintenance effectuée</span>
                <span className="font-semibold">15 points</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span>Visite organisée</span>
                <span className="font-semibold">10 points</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

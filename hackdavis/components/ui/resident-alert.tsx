import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, MapPin } from "lucide-react";

interface ResidentAlertProps {
  data: {
    time_since_request: string;
    location: string;
    description: string;
    steps_to_consider: string[];
  };
}

export default function ResidentAlert({ data }: ResidentAlertProps) {
  return (
    <Card className="max-w-md w-full shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">Resident Alert</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {data.time_since_request}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 mt-1">
          <MapPin className="h-3 w-3" />
          {data.location}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">
            Situation
          </h3>
          <p className="text-sm">{data.description}</p>
        </div>

        <div>
          <h3 className="font-medium text-sm text-muted-foreground mb-1">
            Steps to Consider
          </h3>
          <ul className="text-sm space-y-2">
            {data.steps_to_consider.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-4">
        <div className="text-xs text-muted-foreground">
          Please respond to this alert according to facility protocols
        </div>
      </CardFooter>
    </Card>
  );
}

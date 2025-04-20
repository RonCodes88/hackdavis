"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, Info } from "lucide-react";

interface HealthInfo {
  age: number;
  medical_conditions: string[];
  medications: string[];
  food_allergies: string[];
  special_supportive_services: string[];
}

interface Ingredient {
  name: string;
  quantity: string;
}

interface Benefit {
  title: string;
  description: string;
}

interface RecipeNotes {
  summary: string;
  benefits: Benefit[];
}

interface Recipe {
  id: number;
  name: string;
  prepTime: string;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  notes: RecipeNotes;
}

interface RecipePageProps {
  residentName: string;
}

export default function RecipePage({ residentName }: RecipePageProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Utility to parse strings to arrays
  const toArray = (val: string): string[] =>
    typeof val === "string"
      ? val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const recipeRes = await fetch(
          `http://localhost:8000/get-recipes-by-name/${residentName}`
        );
        const healthRes = await fetch(
          `http://localhost:8000/get-resident-info/${residentName}`
        );

        const recipeData = await recipeRes.json();
        const healthData = await healthRes.json();

        setRecipe(recipeData);
        console.log(recipeData);
        setHealth({
          age: healthData.age ?? 0,
          medical_conditions: toArray(healthData.medical_conditions),
          medications: toArray(healthData.medications),
          food_allergies: toArray(healthData.food_allergies),
          special_supportive_services: toArray(
            healthData.special_supportive_services
          ),
        });
      } catch (error) {
        console.error("Error loading data:", error);
        alert("An error occurred while loading data.");
      }
      setLoading(false);
    }

    fetchData();
  }, [residentName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">
            Finding the perfect recipe for your health profile...
          </p>
        </div>
      </div>
    );
  }

  if (!recipe || !health) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-500">
            No suitable recipe found. Please try different health parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-8 md:grid-cols-3">
        {/* Health Profile Summary */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Health Profile</CardTitle>
              <CardDescription>
                Personalized recipe based on your health information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Age
                </h3>
                <p>{health.age} years</p>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Medical Conditions
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {health.medical_conditions.map((condition, index) => (
                    <Badge key={index} variant="outline">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Medications
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {health.medications.map((medication, index) => (
                    <Badge key={index} variant="outline">
                      {medication}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Food Allergies
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {health.food_allergies.length > 0 ? (
                    health.food_allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive">
                        {allergy}
                      </Badge>
                    ))
                  ) : (
                    <p>None</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-muted-foreground">
                  Support Services
                </h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {health.special_supportive_services.map((service, index) => (
                    <Badge key={index} variant="secondary">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe Details */}
        <div className="md:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">{recipe.name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{recipe.prepTime}</span>
                </div>
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span>
                    {recipe.servings}{" "}
                    {recipe.servings === 1 ? "serving" : "servings"}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-3">Ingredients</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{ingredient.name}</span>
                      <span className="text-muted-foreground">
                        {ingredient.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-3">Instructions</h2>
                <ol className="space-y-3 list-decimal list-inside">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="pl-2">
                      <span className="ml-2">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-3 flex items-center">
                  <Info className="mr-2 h-5 w-5" />
                  Health Notes
                </h2>
                <p className="mb-4 text-muted-foreground">
                  {recipe.notes.summary}
                </p>

                <div className="space-y-4">
                  {recipe.notes.benefits.map((benefit, index) => (
                    <div key={index} className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-medium mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Recipe ID: {recipe.id}
              </p>
              <Badge variant="outline" className="ml-auto">
                Personalized
              </Badge>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

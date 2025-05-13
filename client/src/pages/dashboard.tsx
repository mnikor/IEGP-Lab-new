import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Beaker, FileText } from "lucide-react";

const Dashboard: React.FC = () => {
  const { data: recentConcepts, isLoading: loadingConcepts } = useQuery({
    queryKey: ["/api/study-concepts/recent"],
  });

  const { data: recentValidations, isLoading: loadingValidations } = useQuery({
    queryKey: ["/api/synopsis-validations/recent"],
  });

  const activityData = [
    { name: 'Jan', concepts: 4, validations: 2 },
    { name: 'Feb', concepts: 6, validations: 3 },
    { name: 'Mar', concepts: 8, validations: 5 },
    { name: 'Apr', concepts: 5, validations: 7 },
    { name: 'May', concepts: 9, validations: 4 },
    { name: 'Jun', concepts: 7, validations: 6 },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-dark">Dashboard</h1>
        <p className="text-neutral-medium mt-1">
          Overview of your clinical study projects and activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Concepts</CardTitle>
            <CardDescription>Generated study concepts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">24</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Validations</CardTitle>
            <CardDescription>Validated synopses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">16</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Score</CardTitle>
            <CardDescription>MCDA composite score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">4.2/5</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="concepts" name="Concepts" fill="hsl(var(--primary))" />
                    <Bar dataKey="validations" name="Validations" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/generate-concept">
                <Button className="w-full justify-start" variant="outline">
                  <Beaker className="mr-2 h-4 w-4" />
                  Generate New Concept
                </Button>
              </Link>
              <Link href="/validate-synopsis">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Validate Synopsis
                </Button>
              </Link>
              <Link href="/reports">
                <Button className="w-full justify-start" variant="outline">
                  <BarChart className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-6">
        <Tabs defaultValue="recent-concepts">
          <TabsList>
            <TabsTrigger value="recent-concepts">Recent Concepts</TabsTrigger>
            <TabsTrigger value="recent-validations">Recent Validations</TabsTrigger>
          </TabsList>
          <TabsContent value="recent-concepts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {loadingConcepts ? (
                <p>Loading recent concepts...</p>
              ) : recentConcepts && recentConcepts.length > 0 ? (
                recentConcepts.map((concept: any) => (
                  <Card key={concept.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-primary text-base">{concept.title}</CardTitle>
                      <CardDescription>{new Date(concept.createdAt).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Link href={`/concept/${concept.id}`}>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <p>No recent concepts found.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="recent-validations">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {loadingValidations ? (
                <p>Loading recent validations...</p>
              ) : recentValidations && recentValidations.length > 0 ? (
                recentValidations.map((validation: any) => (
                  <Card key={validation.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-primary text-base">{validation.title}</CardTitle>
                      <CardDescription>{new Date(validation.createdAt).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Link href={`/validation/${validation.id}`}>
                        <Button variant="ghost" size="sm">View Details</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <p>No recent validations found.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Dashboard;

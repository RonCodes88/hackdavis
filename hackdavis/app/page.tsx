import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HeartPulse,
  Apple,
  Salad,
  Utensils,
  ChevronRight,
  Mail,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-2 items-center text-lg font-bold text-red-600">
            <HeartPulse className="h-6 w-6 text-red-600" />
            <span>Personalized AI Assistant</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-1 gap-2">
              <Link
                href="#features"
                className="text-sm font-medium transition-colors hover:text-red-600"
              >
                Features
              </Link>
              <Link
                href="#recommendations"
                className="text-sm font-medium transition-colors hover:text-red-600"
              >
                Reviews
              </Link>
              <Link
                href="#contact"
                className="text-sm font-medium transition-colors hover:text-red-600"
              >
                Contact
              </Link>
              <Button size="sm" asChild>
                  <Link href="/select-role">
                    Get Started
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-red-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Personalized AI Assistant Caretaker
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    Treat yourself with the care you deserve
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/select-role">
                      Get Started
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline">
                    About
                  </Button>
                </div>
              </div>
              <Image
                src="/HomePageCaretaker.jpg"
                width={550}
                height={550}
                alt="Hero Image"
                className="mx-auto aspect-square overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Features
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl">
                  Current features that our AI Agents can do!
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 p-3">
                    <Apple className="h-6 w-6 text-red-700" />
                  </div>
                  <CardTitle>Personal Meal Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Receive catered meal recommendations based on the patients current health condition.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Salad className="h-6 w-6 text-red-700" />
                  </div>
                  <CardTitle>AI Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">We utilize Claude, Vectera, and Computer Vision to give users the best possible experience.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Utensils className="h-6 w-6 text-red-700" />
                  </div>
                  <CardTitle>Good for Caretakers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Receive advice and personal recommendations to treat every patient with the utmost of care.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="recommendations"
          className="w-full py-12 md:py-24 lg:py-32 bg-red-50"
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  See what our residents have to say!
                </h2>
              </div>
            </div>

            <Tabs defaultValue="tab1" className="mt-8 w-full max-w-4xl mx-auto">
              <TabsContent value="tab1" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alice</CardTitle>
                      <CardDescription>I wanna kiss whoever made this</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Image
                        src="/Alice.jpg"
                        width={300}
                        height={200}
                        alt="Card image"
                        className="rounded-lg object-cover w-full h-40 mb-4"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Bob</CardTitle>
                      <CardDescription>Very cool</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Image
                        src="/Bob.jpg"
                        width={300}
                        height={200}
                        alt="Card image"
                        className="rounded-lg object-cover w-full h-40 mb-4"
                      />
                    </CardContent>

                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Trudy</CardTitle>
                      <p>Very cool 👍 Dodged death gg</p>
                    </CardHeader>
                    <CardContent>
                      <Image
                        src="/Trudy.jpeg"
                        width={300}
                        height={200}
                        alt="Card image"
                        className="rounded-lg object-cover w-full h-40 mb-4"
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
            </Tabs>
          </div>
        </section>

        <section id="contact" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                    Contact Us
                  </h2>
                  <p className="max-w-[600px] text-gray-500 md:text-xl">
                    For any inquires, please contact kenny.nguyen05@sjsu.edu
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg">Contact</Button>
                  <Button size="lg" variant="outline">
                    Don&apos; know what to put here.
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-xl bg-red-50 p-6">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-red-700" />
                  <h3 className="text-xl font-bold">Contact Form</h3>
                </div>
                <form className="grid gap-4">
                  <div className="grid gap-2">
                    <Input placeholder="Name" />
                  </div>
                  <div className="grid gap-2">
                    <Input type="Email" placeholder="Email" />
                  </div>
                  <div className="grid gap-2">
                    <select
                      defaultValue=""
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Select dropdown placeholder
                      </option>
                      <option value="option1">Option 1</option>
                      <option value="option2">Option 2</option>
                      <option value="option3">Option 3</option>
                      <option value="option4">Option 4</option>
                    </select>
                  </div>
                  <Button type="submit">Submit Button</Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-white">
        <div className="container mx-auto flex flex-col gap-6 py-8 md:flex-row md:py-12">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center text-lg font-bold text-red-600">
              <HeartPulse className="h-6 w-6" />
              <span>AI Care</span>
            </div>
            <p className="text-sm text-gray-500">Get the care you deserve.</p>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Our LinkedIn</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="https://www.linkedin.com/in/kennyiscool/" target="_blank" className="text-gray-500 hover:text-gray-900">
                    Kenny Nguyen
                  </Link>
                </li>
                <li>
                  <Link href="https://www.linkedin.com/in/ronaldliyh/" target="_blank" className="text-gray-500 hover:text-gray-900">
                    Ronald Li
                  </Link>
                </li>
                <li>
                  <Link href="https://www.linkedin.com/in/saiwong100/" target="_blank" className="text-gray-500 hover:text-gray-900">
                    Sai Wong
                  </Link>
                </li>
                <li>
                  <Link href="https://www.linkedin.com/in/jauyong4/" target="_blank" className="text-gray-500 hover:text-gray-900">
                    Johnathan Auyoung
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Contact us via email</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" target="_blank" className="text-gray-500 hover:text-gray-900">
                    Skennymon@gmail.com
                  </Link>
                </li>
                <li>
                  <Link href="#" target="_blank" className="text-gray-500 hover:text-gray-900">
                    mr.saiwong@gmail.com
                  </Link>
                </li>
                <li>
                  <Link href="#" target="_blank" className="text-gray-500 hover:text-gray-900">
                    ronaldliyh@gmail.com
                  </Link>
                </li>
                <li>
                  <Link href="#" target="_blank" className="text-gray-500 hover:text-gray-900">
                    jauyong1011@gmail.com
                  </Link>
                </li>
                
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Our Githubs</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-gray-500 hover:text-gray-900">
                    Kenny Nguyen
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-500 hover:text-gray-900">
                    Sai Wong
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-500 hover:text-gray-900">
                    Yi Hao (Ronald)
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-500 hover:text-gray-900">
                      Yi Hao (Ronald)
                  </Link>
                </li>
              </ul>
            </div>
            
          </div>
        </div>
      </footer>
    </div>
  );
}

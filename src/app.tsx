import { Button, Card, Text } from "@sbwb-design-system/ui-core";

export function App() {
  return (
    <div className="sw:container">
      <Card className="sw:p-10 sw:bg-purple-200">
        <Text variant="h1">Hello, Vite!</Text>
        <Button onClick={() => alert("Hello, Vite!")}>
          Click me
        </Button>
      </Card>
    </div>
  )
}
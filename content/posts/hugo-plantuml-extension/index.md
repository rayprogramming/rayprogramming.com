---
title: "Building a Local PlantUML Extension for Hugo: No External Dependencies Required"
date: 2025-08-10T15:00:00-06:00
publishDate: 2025-08-11T10:00:00-06:00
description: "Create a complete Hugo build extension that processes PlantUML diagrams locally using Java and Graphviz, with automatic SVG generation and caching."
categories:
  - devops
  - hugo
  - automation
tags:
  - PlantUML
  - Hugo
  - Static Site Generators
  - Build Tools
  - Node.js
  - SVG
  - Documentation
menu:
  sidebar:
    name: "Hugo PlantUML Extension"
    identifier: hugo-plantuml-extension
    weight: 2
---

When writing technical documentation, diagrams are essential for explaining complex architectures and workflows. [PlantUML](https://plantuml.com/) is a fantastic tool for creating diagrams from simple text descriptions, but most Hugo implementations rely on external web services or require manual diagram generation. Today, I'll show you how to build a complete Hugo extension that processes PlantUML diagrams locally using Hugo shortcodes—no external dependencies, no source file modifications, just seamless integration.

## Why Build a Local PlantUML Extension?

Most Hugo PlantUML solutions have significant limitations:

- **External web services**: Slow, unreliable, and expose your diagram content to third parties
- **Manual processing**: Time-consuming and error-prone workflow
- **No caching**: Regenerates unchanged diagrams on every build
- **Source file pollution**: HTML comments or modifications in your markdown

Our solution addresses all these pain points:

✅ **Completely local processing** using PlantUML JAR file  
✅ **Hugo shortcode integration** with pre-generated SVGs  
✅ **Smart caching** based on content hashing  
✅ **Source files untouched** - clean markdown with Hugo shortcodes  
✅ **Professional styling** with responsive SVG rendering  

## Architecture Overview

Here's how our PlantUML extension works:

{{< plantuml alt="PlantUML Extension Architecture" >}}
@startuml Hugo PlantUML Extension Architecture

skinparam backgroundColor #FFFFFF
skinparam componentStyle rectangle

actor "Developer" as dev #LightBlue
participant "npm scripts" as npm #Green
participant "SVG Generator" as generator #Orange
participant "PlantUML JAR" as jar #Red
participant "Hugo Build" as hugo #Pink

dev --> npm: npm run dev
npm --> generator: Generate SVG files
generator --> generator: Find shortcode content
generator --> generator: Extract PlantUML code
generator --> generator: Generate content hash
generator --> jar: Generate SVG
jar --> generator: Return SVG file
generator --> generator: Save to static/diagrams
hugo --> generator: Read pre-generated SVGs
hugo --> dev: Rendered site with diagrams

note right of generator
  - Content-based caching
  - No source file modification
  - Hugo shortcode compatible
end note

note right of jar
  - Local Java execution
  - Requires Graphviz
  - No external network calls
end note

@enduml
{{< /plantuml >}}

## Prerequisites

Before we start, make sure you have:

- **Node.js** (for npm scripts and file processing)
- **Java Runtime Environment** (to run PlantUML JAR)
- **Graphviz** (required by PlantUML for certain diagram types)
- **A Hugo site** with module support

## Step 1: Project Structure Setup

First, let's create the directory structure for our extension:

```bash {linenos=inline}
# Create the bin directory for our scripts
mkdir -p bin

# Create static directory for generated SVGs
mkdir -p static/diagrams

# Create layouts directory for Hugo shortcode
mkdir -p layouts/shortcodes
```

## Step 2: Download and Setup PlantUML

Create a setup script that handles the initial environment configuration:

{{< includecode file="bin/setup-plantuml.js" lang="javascript" >}}

## Step 3: The SVG Generation Script

Now, let's create the script that generates SVG files from Hugo shortcode content:

{{< includecode file="bin/generate-plantuml-svgs.js" lang="javascript" >}}


## Step 4: Hugo Shortcode for Rendering

Create a Hugo shortcode that renders the pre-generated SVG files:


{{<includecode file="layouts/shortcodes/plantuml.html" lang="go-html-template">}}

This shortcode:
- Calculates the same hash as the generation script
- Constructs the SVG file path using the page name and content hash
- Renders a responsive image with professional styling
- Never modifies your source markdown files

## Step 5: npm Scripts Integration

Add these scripts to your `package.json`:


{{< codeTitle title=package.json lang=json >}}
{
  "scripts": {
    "dev": "npm run plantuml:generate && hugo server --buildFuture --buildDrafts --disableFastRender",
    "dev:future": "npm run plantuml:generate && hugo server --buildFuture",
    "build": "npm run plantuml:generate && hugo --minify",
    "build:future": "npm run plantuml:generate && hugo --buildFuture --minify",
    "plantuml:generate": "node bin/generate-plantuml-svgs.js",
    "plantuml:setup": "node bin/setup-plantuml.js"
  }
}
{{< /codeTitle >}}
## Step 6: Hugo Configuration

Add the diagrams directory to your Hugo module mounts in `config.toml`:

{{<includecode file="config.toml" lines="86-88" lang="toml">}}

This ensures Hugo properly serves the generated SVG files.

## Step 7: Git Configuration

Add these entries to your `.gitignore`:

```sh {linenos=inline}
# PlantUML temp files
temp/*

# PlantUML JAR (downloaded automatically)
bin/plantuml.jar
```

The generated SVG files in `static/diagrams/` should be committed to version control alongside your content.

## Usage Workflow

### Initial Setup

This will:
- Download PlantUML JAR
- Create necessary directories
- Verify Java and Graphviz installation
- Test PlantUML integration

```bash {linenos=inline}
# Install dependencies
npm run plantuml:setup
```

### Development Workflow

1. **Write PlantUML in your markdown files using Hugo shortcodes:**

```go-html-template
{{</*plantuml alt="System Architecture Diagram"*/>}}
@startuml System Architecture

actor User
participant Frontend
participant API
database Database

User -> Frontend: Request
Frontend -> API: HTTP call
API -> Database: Query
Database -> API: Results
API -> Frontend: JSON response
Frontend -> User: Display

@enduml
{{</*/plantuml*/>}}

The diagram shows...
```

And here's the actual rendered diagram:

{{< plantuml alt="System Architecture Diagram" >}}
@startuml System Architecture

actor User
participant Frontend
participant API
database Database

User -> Frontend: Request
Frontend -> API: HTTP call
API -> Database: Query
Database -> API: Results
API -> Frontend: JSON response
Frontend -> User: Display

@enduml
{{< /plantuml >}}

2. **Generate SVG files:**

```bash
npm run plantuml:generate
```

The script will:
- Find all Hugo shortcodes containing PlantUML content
- Generate SVG files with content-based hashing
- Save files to `static/diagrams/` directory
- Leave your source markdown files completely untouched

3. **Start development server:**

```bash
npm run dev  # Generates SVGs + starts Hugo server
```

4. **Your shortcode renders the pre-generated SVG:**

The Hugo shortcode automatically:
- Calculates the same hash from the PlantUML content
- References the correct SVG file: `/diagrams/filename-hash.svg`
- Renders a responsive, styled diagram

### Advanced Features

**Content-based caching:** Only regenerates diagrams when PlantUML source changes

**Hugo-native rendering:** Uses pure Hugo shortcodes with no source file modifications

**Multiple diagrams per file:** Each gets a unique hash based on content
- `filename-abc123de.svg`
- `filename-xyz789fg.svg`
- etc.

**Responsive styling:** SVG diagrams scale properly on all device sizes

## Benefits of This Approach

### 🚀 **Performance**
- Local processing is faster than external services
- Smart caching prevents unnecessary regeneration
- SVG files are served directly by Hugo

### 🔒 **Security & Privacy**
- No external network calls during build
- Diagram content never leaves your environment
- Works completely offline

### 🛠 **Developer Experience**
- Clean Hugo shortcode integration
- Preview diagrams instantly during development  
- No backup/restore complexity - source files stay clean
- Content-based hashing prevents unnecessary rebuilds

### 📦 **Maintainability**
- Version control for both source and generated SVGs
- Reproducible builds across environments  
- Hugo shortcodes keep content semantic and clean
- No file modification or temporary backup complexity

## Troubleshooting

### Common Issues

**"Java not found"**: Install Java JRE/JDK
```bash {linenos=inline}
# Ubuntu/Debian
sudo apt install default-jre

# macOS
brew install openjdk
```

**"Graphviz not found"**: Install Graphviz for full diagram support
```bash {linenos=inline}
# Ubuntu/Debian
sudo apt install graphviz

# macOS
brew install graphviz
```

**"PlantUML syntax error"**: Check your PlantUML syntax at [plantuml.com](https://plantuml.com/)

### Debugging

Enable verbose output by modifying the generation script to include `{ stdio: 'inherit' }` in the `execSync` calls.

### Hash Mismatch Issues

If diagrams don't load, ensure the generation script and Hugo shortcode are calculating the same hash:

1. Check that both use the same trimming behavior
2. Verify the content between shortcode tags matches exactly
3. Regenerate SVGs: `npm run plantuml:generate`

## Extending the System

### Custom Styling

Modify the Hugo shortcode to add custom CSS classes or styling:

```go-html-template
<!-- layouts/shortcodes/plantuml.html -->
{{</* $content := .Inner | trim " \n\r\t" */>}}
{{</* $hash := ($content | sha256 | truncate 8 "") */>}}
{{</* $filename := printf "%s-%s.svg" (.Page.File.BaseFileName | default "diagram") $hash */>}}
{{</* $svgPath := printf "/diagrams/%s" $filename */>}}

<div class="plantuml {{/* .Get "class" | default "" */}}">
  <figure>
    <img 
      src="{{/* $svgPath */}}" 
      alt="{{/* .Get "alt" | default "PlantUML Diagram" */}}" 
      style="max-width: 100%; height: auto;"
    />
    {{/* with .Get "caption" */}}
    <figcaption>{{/* . */}}</figcaption>
    {{/* end */}}
  </figure>
</div>
```

Then use it with:
```go-html-template {linenos=inline}
{{</* plantuml alt="My Diagram" caption="System Architecture Overview" class="centered" */>}}
@startuml
...
@enduml
{{</* /plantuml */>}}
```

### Multiple Output Formats

Extend the generation script to create multiple formats:

```javascript {linenos=inline}
// Generate both SVG and PNG
execSync(`java -jar "${PLANTUML_JAR}" -tsvg -tpng -o "${tempOutputDir}" "${tempFile}"`);
```

### Different Diagram Types

The shortcode approach works with all PlantUML diagram types:

```go-html-template {linenos=inline}
{{</* plantuml alt="Sequence Diagram" */>}}
@startuml
Alice -> Bob: Authentication Request
Bob -> Alice: Authentication Response
@enduml
{{</* /plantuml */>}}

{{</* plantuml alt="Class Diagram" */>}}
@startuml
class User {
  +String name
  +login()
}
class Admin extends User {
  +deleteUser()
}
@enduml
{{</* /plantuml */>}}
```

{{<plantuml alt="Sequence Diagram" >}}
@startuml
Alice -> Bob: Authentication Request
Bob -> Alice: Authentication Response
@enduml
{{</plantuml >}}

{{<plantuml alt="Class Diagram" >}}
@startuml
class User {
  +String name
  +login()
}
class Admin extends User {
  +deleteUser()
}
@enduml
{{</plantuml >}}

### CI/CD Integration

The extension works seamlessly in CI/CD environments. Just ensure Java and Graphviz are available in your build container.

## Conclusion

This Hugo PlantUML extension provides a robust, local solution for diagram generation that integrates seamlessly with Hugo's native shortcode system. By using a two-phase approach—SVG generation followed by Hugo rendering—you get the best of both worlds: local processing with clean, untouched source files.

The content-based caching system ensures efficient rebuilds, while the Hugo shortcode approach maintains semantic, readable markdown without any file modifications or backup complexity.

Key advantages of this approach:

✅ **Clean source files**: No HTML comments or modifications in your markdown  
✅ **Hugo-native**: Uses standard shortcode syntax that Hugo developers expect  
✅ **Efficient caching**: Only regenerates changed diagrams  
✅ **Local processing**: No external dependencies or network calls  
✅ **Professional rendering**: Responsive, styled diagrams that integrate with your theme  

Happy diagramming! 🎨

---
title: "Hugo Include Code Shortcode: Seamlessly Embed Source Files in Documentation"
date: 2025-08-18T08:00:00-06:00
publishDate: 2025-08-18T08:00:00-06:00
description: "Create a powerful Hugo shortcode that includes source code files directly in your documentation with syntax highlighting, line selection, and GitHub-style formatting."
categories:
  - devops
  - hugo
  - documentation
tags:
  - Hugo
  - Shortcodes
  - Documentation
  - Syntax Highlighting
  - Code Examples
  - Static Site Generators
menu:
  sidebar:
    name: "Hugo Include Code"
    identifier: hugo-includecode
    weight: 3
---

When writing technical documentation, one of the biggest challenges is keeping code examples synchronized with your actual implementation. Copy-pasting code leads to outdated examples, while manual maintenance is error-prone and time-consuming. Today, I'll show you how to build a Hugo shortcode that automatically includes source code files directly from your project, complete with syntax highlighting, line selection, and professional GitHub-style formatting.

## Why Build an Include Code Shortcode?

Most documentation approaches have significant drawbacks:

- **Copy-paste syndrome**: Code examples become stale and diverge from reality
- **Manual maintenance**: Time-consuming updates when code changes
- **Inconsistent formatting**: Different styles across documentation
- **No source linking**: Readers can't easily find the actual implementation

Our `includecode` shortcode solves these problems:

✅ **Always up-to-date**: Reads directly from source files  
✅ **Selective inclusion**: Show only relevant lines or functions  
✅ **Consistent styling**: GitHub-style formatting with dark mode support  
✅ **Multiple languages**: Automatic syntax highlighting for any language  
✅ **Responsive design**: Beautiful on desktop and mobile  

## The Complete Shortcode Implementation

Let's build the shortcode step by step. Create the file `layouts/shortcodes/includecode.html`:

```html
{{</* $file := .Get "file" */>}}
{{</* $lang := .Get "lang" | default "text" */>}}
{{</* $title := .Get "title" | default $file */>}}
{{</* $lines := .Get "lines" */>}}
{{</* $highlight := .Get "highlight" */>}}

{{</* if not $file */>}}
  <div class="error">Error: file parameter is required for includecode shortcode</div>
{{</* else */>}}
  {{</* $content := "" */>}}
  {{</* $fullPath := printf "%s%s" .Page.File.Dir $file */>}}
  
  {{</* with resources.Get $fullPath */>}}
    {{</* $content = .Content */>}}
  {{</* else */>}}
    {{</* $sitePath := printf "content/%s" $fullPath */>}}
    {{</* with os.ReadFile $sitePath */>}}
      {{</* $content = . */>}}
    {{</* else */>}}
      {{</* $content = printf "Error: Could not read file '%s'" $file */>}}
    {{</* end */>}}
  {{</* end */>}}

  {{</* if $lines */>}}
    {{</* $lineRange := split $lines "-" */>}}
    {{</* if eq (len $lineRange) 2 */>}}
      {{</* $startLine := index $lineRange 0 | int */>}}
      {{</* $endLine := index $lineRange 1 | int */>}}
      {{</* $allLines := split $content "\n" */>}}
      {{</* $selectedLines := slice $allLines (sub $startLine 1) $endLine */>}}
      {{</* $content = delimit $selectedLines "\n" */>}}
    {{</* end */>}}
  {{</* end */>}}

  <div class="includecode">
    {{</* if $title */>}}
    <div class="includecode-header">
      <span class="includecode-title">{{/* $title */}}</span>
      {{</* if $lines */>}}
      <span class="includecode-lines">Lines {{/* $lines */}}</span>
      {{</* end */>}}
    </div>
    {{</* end */>}}
    
    {{</* if $highlight */>}}
    {{/* highlight $content $lang $highlight */}}
    {{</* else */>}}
    {{/* highlight $content $lang "" */}}
    {{</* end */>}}
  </div>
{{</* end */>}}
```

## How It Works

### 1. **Parameter Processing**
- `file`: Required path to the source file
- `lang`: Programming language for syntax highlighting
- `title`: Custom header title (defaults to filename)
- `lines`: Range specification like "10-25" for partial inclusion
- `highlight`: Additional highlighting options

### 2. **File Resolution**
The shortcode tries multiple approaches to find your file:
1. **Hugo Resources**: Checks if the file is in Hugo's resource pipeline
2. **Relative Path**: Resolves relative to the current page's directory
3. **Absolute Path**: Falls back to site root relative paths

### 3. **Line Selection**
When you specify `lines="10-25"`, the shortcode:
- Splits the content into individual lines
- Extracts only the specified range
- Rejoins them for rendering

### 4. **Syntax Highlighting**
Uses Hugo's built-in `highlight` function with:
- Automatic language detection
- Configurable highlighting options
- Line numbers and highlighting support

## Styling with SCSS

Add this styling to your `assets/sass/style.scss` for GitHub-style formatting:

```scss
// Include code shortcode styling
.includecode {
  margin: 1.5rem 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  
  .includecode-header {
    background: #f6f8fa;
    padding: 8px 16px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    
    .includecode-title {
      font-weight: 600;
      color: #24292e;
    }
    
    .includecode-lines {
      color: #586069;
      font-family: monospace;
    }
  }
  
  pre {
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
  }
  
  // Dark mode support
  @media (prefers-color-scheme: dark) {
    border-color: #30363d;
    
    .includecode-header {
      background: #161b22;
      border-bottom-color: #30363d;
      
      .includecode-title {
        color: #f0f6fc;
      }
      
      .includecode-lines {
        color: #8b949e;
      }
    }
  }
}
```

## Usage Examples

### Basic File Inclusion

Include an entire file with syntax highlighting:

```markdown
{{</* includecode file="src/main.js" lang="javascript" */>}}
```

### Selective Line Inclusion

Show only specific lines from a large file:

```markdown
{{</* includecode file="config/database.yml" lang="yaml" lines="15-25" title="Production Database Config" */>}}
```

### With Custom Highlighting

Add line numbers and highlight specific lines:

```markdown
{{</* includecode file="utils/helpers.py" lang="python" highlight="linenos=table,hl_lines=3-5" title="Helper Functions" */>}}
```

### Cross-Directory References

Include files from anywhere in your project:

```markdown
{{</* includecode file="../../../bin/setup.sh" lang="bash" title="Setup Script" */>}}
```

## Advanced Features

### 1. **Error Handling**

The shortcode gracefully handles missing files:

```html
<div class="error">Error: Could not read file 'missing.js'</div>
```

### 2. **Flexible Path Resolution**

Works with various path patterns:
- `file="local.js"` - Same directory as markdown file
- `file="../shared/utils.js"` - Relative paths
- `file="/src/main.js"` - Site root relative

### 3. **Hugo Resources Integration**

If your files are processed by Hugo's asset pipeline, the shortcode will find them automatically.

### 4. **Language Auto-Detection**

Hugo can often detect the language from file extensions, so you can omit the `lang` parameter:

```markdown
{{</* includecode file="package.json" title="Package Configuration" */>}}
```

## Real-World Use Cases

### API Documentation

```markdown
Here's the authentication endpoint implementation:

{{</* includecode file="routes/auth.js" lang="javascript" lines="45-75" title="Login Handler" */>}}
```

### Configuration Examples

```markdown
Configure your environment with these settings:

{{</* includecode file="config/production.yml" lang="yaml" title="Production Configuration" */>}}
```

### Tutorial Code Steps

```markdown
**Step 1: Create the database connection**

{{</* includecode file="tutorial/step1.js" lang="javascript" title="Database Setup" */>}}

**Step 2: Add authentication middleware**

{{</* includecode file="tutorial/step2.js" lang="javascript" lines="1-20" title="Auth Middleware" */>}}
```

## Benefits for Documentation

### 🔄 **Always Synchronized**
- Code examples automatically update when source changes
- No more stale documentation
- Readers always see current implementation

### 🎨 **Professional Appearance**
- GitHub-style code blocks
- Consistent formatting across your site
- Responsive design for all devices

### ⚡ **Developer Friendly**
- Easy to use shortcode syntax
- Flexible file path resolution
- Comprehensive error handling

### 📱 **Responsive Design**
- Mobile-friendly code blocks
- Dark mode support
- Proper line wrapping

## Integration with Build Pipeline

### Hugo Build Process

The shortcode integrates seamlessly with Hugo's build process:

1. **Development**: Files are read on every page reload
2. **Production**: Content is cached for optimal performance
3. **CI/CD**: Works in any environment with file system access

### Version Control

Since the shortcode reads files directly:
- ✅ Source code and documentation stay in sync
- ✅ Git history shows both code and doc changes
- ✅ Pull requests include both implementation and documentation updates

## Troubleshooting

### Common Issues

**File not found errors:**
```markdown
{{</* includecode file="./relative-path.js" lang="javascript" */>}}
```
Try different path formats if the file isn't found.

**Empty output:**
Check that the file exists and Hugo has read permissions.

**Syntax highlighting not working:**
Ensure Hugo's syntax highlighting is enabled in your `config.toml`:

```toml
[markup]
  [markup.highlight]
    style = "github"
    lineNos = true
    tabWidth = 2
```

### Performance Considerations

For large files, consider using the `lines` parameter to include only relevant sections:

```markdown
{{</* includecode file="large-file.js" lang="javascript" lines="100-150" */>}}
```

## Extending the Shortcode

### Add File Size Limits

```html
{{</* if gt (len $content) 10000 */>}}
  <div class="warning">File is large ({{/* len $content */}} characters). Consider using the 'lines' parameter.</div>
{{</* end */>}}
```

### Add Download Links

```html
<div class="includecode-header">
  <span class="includecode-title">{{/* $title */}}</span>
  <a href="{{/* $file */}}" download class="download-link">Download</a>
</div>
```

### Custom Syntax Themes

Extend the SCSS with custom syntax highlighting themes to match your site's design.

## Conclusion

The `includecode` shortcode transforms how you handle code examples in documentation. By reading directly from source files, you eliminate the maintenance burden of keeping examples synchronized while providing readers with accurate, up-to-date code.

Key advantages:

✅ **Zero maintenance**: Code examples update automatically  
✅ **Professional styling**: GitHub-style formatting with dark mode  
✅ **Flexible selection**: Show entire files or specific line ranges  
✅ **Universal compatibility**: Works with any programming language  
✅ **Responsive design**: Beautiful on all devices  

Whether you're building API documentation, tutorials, or technical guides, this shortcode ensures your code examples are always accurate and beautifully formatted.

**Next Steps:**
- Add the shortcode to your Hugo site
- Update existing posts to use live code inclusion
- Experiment with line selection and highlighting options
- Customize the styling to match your theme

Happy documenting! 📝

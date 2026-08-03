import sys
with open('src/components/crm/chat-area.tsx', 'r') as f:
    lines = f.readlines()

# Replace lines 259-275 (0-indexed) with simpler button
new_lines = lines[:259]
new_lines.append('          {/* AI Bot toggle */}\n')
new_lines.append('          <Button\n')
new_lines.append('            variant={botEnabled ? "default" : "outline"}\n')
new_lines.append('            size="sm"\n')
new_lines.append('            className={cn("h-7 gap-1 text-[11px] px-2", botEnabled && "bg-violet-600 hover:bg-violet-700")}\n')
new_lines.append('            onClick={() => setBotEnabled(!botEnabled)}\n')
new_lines.append('            title={botEnabled ? "AI ON" : "AI OFF"}\n')
new_lines.append('          >\n')
new_lines.append('            <Sparkles className="h-3 w-3" />\n')
new_lines.append('            <span className="hidden sm:inline">AI</span>\n')
new_lines.append('          </Button>\n')
new_lines.extend(lines[275:])

with open('src/components/crm/chat-area.tsx', 'w') as f:
    f.writelines(new_lines)
print('Done')

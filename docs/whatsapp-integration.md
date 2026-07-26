# WhatsApp Integration

## Reusable Pieces

- `src/lib/whatsapp.ts`
  - validates and normalizes mobile numbers
  - builds task message text
  - generates official click-to-chat URLs

- `src/components/whatsapp-action-button.tsx`
  - reusable icon button with tooltip
  - opens `https://wa.me/<phone_number>?text=<encoded_message>`
  - shows an error toast for invalid mobile numbers

## Phone Validation

The helper removes non-digits from a phone number.

- 10 digit numbers are treated as Indian mobile numbers and prefixed with `91`.
- 11 to 15 digit numbers are treated as international numbers with country code.
- Other values are invalid.

## Task Table Usage

The Tasks table shows the WhatsApp button only when the assigned officer profile has a valid `phone`.

The message includes:

- officer name
- task title
- task description
- due date
- due time
- priority
- status
- assigned by

## Reuse In Other Modules

Use `WhatsAppActionButton` anywhere a module has a phone number and message:

```tsx
<WhatsAppActionButton
  phone={officer.phone}
  message={message}
/>
```

Set `hideWhenInvalid` when the button should not render without a valid phone:

```tsx
<WhatsAppActionButton
  phone={officer.phone}
  message={message}
  hideWhenInvalid
/>
```

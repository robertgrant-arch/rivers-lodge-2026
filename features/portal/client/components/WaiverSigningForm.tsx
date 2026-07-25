import { useState } from 'react';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';

interface PartyMember {
  name: string;
  isMinor: boolean;
}

interface WaiverSignature {
  memberIndex: number;
  isGuardianSignature: boolean;
  guardianName?: string;
  signatureName: string;
}

interface WaiverSigningFormProps {
  propertyName: string;
  waiverTitle: string;
  waiverBody: string;
  partyMembers: PartyMember[];
  onComplete: (signatures: WaiverSignature[]) => void;
  isLoading?: boolean;
}

export default function WaiverSigningForm({
  propertyName,
  waiverTitle,
  waiverBody,
  partyMembers,
  onComplete,
  isLoading = false,
}: WaiverSigningFormProps) {
  const [currentStep, setCurrentStep] = useState<'review' | 'sign' | 'complete'>('review');
  const [signatures, setSignatures] = useState<WaiverSignature[]>([]);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0);
  const [signatureName, setSignatureName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [isGuardianSignature, setIsGuardianSignature] = useState(false);
  const [error, setError] = useState('');

  const currentMember = partyMembers[currentSignerIndex];
  const needsGuardianSignature = currentMember?.isMinor;

  const handleSignatureComplete = () => {
    setError('');

    if (!signatureName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (needsGuardianSignature && isGuardianSignature && !guardianName.trim()) {
      setError('Please enter the guardian\'s name');
      return;
    }

    const newSignature: WaiverSignature = {
      memberIndex: currentSignerIndex,
      isGuardianSignature,
      guardianName: isGuardianSignature ? guardianName : undefined,
      signatureName,
    };

    const updated = [...signatures];
    const existingIndex = updated.findIndex((s) => s.memberIndex === currentSignerIndex && s.isGuardianSignature === isGuardianSignature);
    if (existingIndex >= 0) {
      updated[existingIndex] = newSignature;
    } else {
      updated.push(newSignature);
    }
    setSignatures(updated);

    // Move to next signer or complete
    if (needsGuardianSignature && !isGuardianSignature) {
      setIsGuardianSignature(true);
      setSignatureName('');
      setGuardianName('');
    } else if (currentSignerIndex < partyMembers.length - 1) {
      setCurrentSignerIndex(currentSignerIndex + 1);
      setSignatureName('');
      setGuardianName('');
      setIsGuardianSignature(false);
    } else {
      setCurrentStep('complete');
    }
  };

  const allSignaturesComplete = (() => {
    for (let i = 0; i < partyMembers.length; i++) {
      const member = partyMembers[i];
      const hasSignature = signatures.some((s) => s.memberIndex === i && !s.isGuardianSignature);
      if (!hasSignature) return false;

      if (member.isMinor) {
        const hasGuardianSignature = signatures.some((s) => s.memberIndex === i && s.isGuardianSignature);
        if (!hasGuardianSignature) return false;
      }
    }
    return true;
  })();

  if (currentStep === 'review') {
    return (
      <div className="space-y-4 py-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100 mb-2">Waiver Required: {propertyName}</h3>
          <p className="text-xs text-stone-400 mb-4">{waiverTitle}</p>
          <div className="bg-stone-800 rounded-lg p-4 max-h-[250px] overflow-y-auto mb-4">
            <p className="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">{waiverBody}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-stone-100 mb-3">Who must sign</h4>
          <ul className="space-y-2">
            {partyMembers.map((member, i) => (
              <li key={i} className="text-xs text-stone-300">
                <span className="font-medium">{member.name}</span>
                {member.isMinor && (
                  <span className="ml-2 text-amber-400">(minor — parent/guardian must sign)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Button
          onClick={() => setCurrentStep('sign')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-medium text-sm"
        >
          I Agree & Continue
        </Button>
      </div>
    );
  }

  if (currentStep === 'sign') {
    return (
      <div className="space-y-4 py-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100 mb-2">
            {isGuardianSignature
              ? `Parent/Guardian Consent for ${currentMember?.name}`
              : `I agree as ${currentMember?.name}`}
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed mb-3">
            {isGuardianSignature
              ? `I certify that I am the parent or guardian of ${currentMember?.name} and I accept this waiver on their behalf.`
              : 'By entering your name below, you confirm that you have read and agree to this waiver.'}
          </p>
        </div>

        {isGuardianSignature && (
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-300">Your Name (Parent/Guardian) *</Label>
            <Input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Your full name"
              className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 rounded text-sm"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-stone-300">Signature (enter your name) *</Label>
          <Input
            type="text"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder={isGuardianSignature ? 'Your full name (signature)' : 'Your full name'}
            className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 rounded text-sm"
          />
          <p className="text-[10px] text-stone-400">Enter your full name as your signature</p>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSignatureName('');
              setGuardianName('');
            }}
            variant="outline"
            className="flex-1 border-stone-700 text-stone-300 hover:text-stone-100 rounded text-sm"
          >
            Clear
          </Button>
          <Button
            onClick={handleSignatureComplete}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            {isLoading ? 'Saving...' : (needsGuardianSignature && !isGuardianSignature ? 'Agree' : 'Next')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 text-center">
      <div className="flex justify-center mb-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="text-green-400 text-lg">✓</span>
        </div>
      </div>
      <div className="text-sm font-semibold text-stone-100 mb-2">All signatures received</div>
      <p className="text-xs text-stone-400 mb-6">
        Thank you! All required waivers have been signed. You can now complete your booking.
      </p>
      <Button
        onClick={() => onComplete(signatures)}
        disabled={!allSignaturesComplete || isLoading}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 font-medium text-sm"
      >
        {isLoading ? 'Processing...' : 'Complete Booking'}
      </Button>
    </div>
  );
}

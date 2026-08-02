import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog"

/**
 * Terms shown from the signup form's consent checkbox.
 *
 * Controlled, with no trigger of its own: `SignupBlock` exposes the terms link
 * as an `onTerms` callback rather than a render slot, so the route owns the
 * open state and opens this from there.
 *
 * The body is a working draft, not reviewed legal text — see the notice at the
 * top of the dialog, which stays until a lawyer replaces the copy.
 */
export default function TermsAndConditionsDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Terms & Conditions</DialogTitle>
                </DialogHeader>
                <DialogPanel>
                    {/* A plain div, not DialogContent — that name is an alias
                        for DialogPopup here, so nesting it renders a second
                        headerless dialog. DialogPanel already supplies the
                        padding and the scroll area. */}
                    <div className="flex flex-col gap-4 [&_strong]:font-semibold [&_strong]:text-foreground">
                        <div className="flex flex-col gap-4">
                            <p className="border-muted-foreground/32 bg-muted/40 rounded-lg border border-dashed p-3 text-sm">
                                <strong>Draft.</strong> A working outline, not
                                reviewed legal text. The wording still needs to be
                                settled before Corpora accepts public sign-ups.
                            </p>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Acceptance of Terms</strong>
                                </p>
                                <p>
                                    By accessing and using this website, users agree to comply
                                    with and be bound by these Terms of Service. Users who do not
                                    agree with these terms should discontinue use of the website
                                    immediately.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>User Account Responsibilities</strong>
                                </p>
                                <p>
                                    Users are responsible for maintaining the confidentiality of
                                    their account credentials. Any activities occurring under a
                                    user&apos;s account are the sole responsibility of the account
                                    holder. Users must notify the website administrators
                                    immediately of any unauthorized account access.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Content Usage and Restrictions</strong>
                                </p>
                                <p>
                                    The website and its original content are protected by
                                    intellectual property laws. Users may not reproduce,
                                    distribute, modify, create derivative works, or commercially
                                    exploit any content without explicit written permission from
                                    the website owners.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Limitation of Liability</strong>
                                </p>
                                <p>
                                    The website provides content &ldquo;as is&rdquo; without any
                                    warranties. The website owners shall not be liable for direct,
                                    indirect, incidental, consequential, or punitive damages
                                    arising from user interactions with the platform.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>User Conduct Guidelines</strong>
                                </p>
                                <ul className="list-disc pl-6">
                                    <li>Not upload harmful or malicious content</li>
                                    <li>Respect the rights of other users</li>
                                    <li>
                                        Avoid activities that could disrupt website functionality
                                    </li>
                                    <li>Comply with applicable local and international laws</li>
                                </ul>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Modifications to Terms</strong>
                                </p>
                                <p>
                                    The website reserves the right to modify these terms at any
                                    time. Continued use of the website after changes constitutes
                                    acceptance of the new terms.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Termination Clause</strong>
                                </p>
                                <p>
                                    The website may terminate or suspend user access without prior
                                    notice for violations of these terms or for any other reason
                                    deemed appropriate by the administration.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p>
                                    <strong>Governing Law</strong>
                                </p>
                                <p>
                                    These terms are governed by the laws of the jurisdiction where
                                    the website is primarily operated, without regard to conflict
                                    of law principles.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
                <DialogFooter>
                    {/* Close only. Consent is the checkbox on the form behind
                        this dialog, and `SignupBlock` keeps that checkbox in
                        its own state with no prop to set it — so an "I agree"
                        button here could not actually tick it. */}
                    <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    )
}

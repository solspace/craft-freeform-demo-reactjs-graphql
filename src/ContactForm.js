import React, { useCallback, useEffect, useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { gql, ApolloClient, InMemoryCache } from '@apollo/client';

const defaultFormData = {
    typeOfContact: '',
    workPhone: '',
    subject: '',
    message: '',
    lastName: '',
    howMuchDoYouEnjoyEatingPie: '',
    howHeardOther: '',
    howDidYouHearAboutThisJobPosting: [],
    homePhone: '',
    firstName: '',
    email: '',
    department: '',
    companyName: '',
    cellPhone: '',
    appointmentDateTime: '',
    acceptTerms: '',
};

const defaultFormProperties = {
    csrf: {
        name: '',
        token: '',
    },
    honeypot: {
        name: '',
        value: '',
    },
    reCaptcha: {
        enabled: false,
        handle: '',
        name: '',
    },
};

const RECAPTCHA_SITE_KEY = '6Lce6nQmAAAAAO5d4LWC6TkECxNRSG7WNiVj17B1';

const client = new ApolloClient({
    uri: 'https://demo.solspace.net/craft/graphql/api',
    headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest',
        'X-Craft-Solspace-Freeform-Mode': 'Headless',
    },
    cache: new InMemoryCache(),
});

async function getFormProperties(formId) {
    // See https://docs.solspace.com/craft/freeform/v4/developer/graphql/#how-to-render-a-form
    const response = await fetch(`https://demo.solspace.net/craft/freeform/form/properties/${formId}`, { headers: { 'Accept': 'application/json' }});

    if (!response.ok) {
        throw new Error('Failed to fetch Craft Freeform Form properties');
    }

    return response.json();
}

async function saveContactSubmission(params) {
    const { reCaptchaValue, formData, formProperties } = params;
    const { csrf, honeypot, reCaptcha } = formProperties;

    return await client.mutate({
        mutation: gql`
            mutation SaveContactSubmission(
                $honeypot: FreeformHoneypotInputType,
                $reCaptcha: FreeformReCaptchaInputType,
                $csrfToken: FreeformCsrfTokenInputType,
                $typeOfContact: String,
                $workPhone: String,
                $subject: String,
                $message: String,
                $lastName: String,
                $howMuchDoYouEnjoyEatingPie: String,
                $howHeardOther: String,
                $howDidYouHearAboutThisJobPosting: [String],
                $homePhone: String,
                $firstName: String,
                $email: String,
                $department: String,
                $companyName: String,
                $cellPhone: String,
                $appointmentDateTime: DateTime,
                $acceptTerms: String
            ) {
                save_contact_Submission(
                    honeypot: $honeypot
                    reCaptcha: $reCaptcha
                    csrfToken: $csrfToken
                    typeOfContact: $typeOfContact
                    workPhone: $workPhone
                    subject: $subject
                    message: $message
                    lastName: $lastName
                    howMuchDoYouEnjoyEatingPie: $howMuchDoYouEnjoyEatingPie
                    howHeardOther: $howHeardOther
                    howDidYouHearAboutThisJobPosting: $howDidYouHearAboutThisJobPosting
                    homePhone: $homePhone
                    firstName: $firstName
                    email: $email
                    department: $department
                    companyName: $companyName
                    cellPhone: $cellPhone
                    appointmentDateTime: $appointmentDateTime
                    acceptTerms: $acceptTerms
                ) {
                    submissionId
                    success
                }
        }
        `,
        variables: {
            honeypot: {
                name: honeypot.name,
                value: honeypot.value,
            },
            csrfToken: {
                name: csrf.name,
                value: csrf.token,
            },
            reCaptcha: {
                name: reCaptcha.name,
                value: reCaptchaValue,
            },
            typeOfContact: formData.typeOfContact,
            firstName: formData.firstName,
            lastName: formData.lastName,
            companyName: formData.companyName,
            email: formData.email,
            cellPhone: formData.cellPhone,
            homePhone: formData.homePhone,
            workPhone: formData.workPhone,
            subject: formData.subject,
            appointmentDateTime: formData.appointmentDateTime,
            department: formData.department,
            howMuchDoYouEnjoyEatingPie: formData.howMuchDoYouEnjoyEatingPie,
            message: formData.message,
            howDidYouHearAboutThisJobPosting: formData.howDidYouHearAboutThisJobPosting,
            howHeardOther: formData.howHeardOther,
            acceptTerms: formData.acceptTerms,
        },
    });
}

const Form = () => {
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [formData, setFormData] = useState(defaultFormData);
    const [reCaptchaValue, setReCaptchaValue] = useState('');
    const [formProperties, setFormProperties] = useState(defaultFormProperties);

    const handleReCaptchaVerify = useCallback(async () => {
        if (!executeRecaptcha) {
            return;
        }

        const token = await executeRecaptcha();
        setReCaptchaValue(token);
    }, [executeRecaptcha]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        handleReCaptchaVerify().then(async () => {
            const response = await saveContactSubmission({ reCaptchaValue, formData, formProperties });
            console.log(response);
        });
    };

    const handleHowDidYouHearAboutThisJobPosting = (event) => {
        let howDidYouHearAboutThisJobPosting = [...formData.howDidYouHearAboutThisJobPosting];

        if (event.target.checked) {
            howDidYouHearAboutThisJobPosting.push(event.target.value);
        } else {
            howDidYouHearAboutThisJobPosting = howDidYouHearAboutThisJobPosting.filter((value) => value !== event.target.value);
        }

        setFormData({
            ...formData,
            howDidYouHearAboutThisJobPosting,
        });
    };

    useEffect(() => {
        handleReCaptchaVerify().then();
    }, [handleReCaptchaVerify]);

    /**
     * Note the ignore variable which is initialized to false, and is set to true during cleanup.
     * This ensures your code doesn't suffer from "race conditions": network responses may arrive in a different order than you sent them.
     */
    useEffect(() => {
        let ignore = false;

        // Set your Freeform Form ID from Craft.
        const formId = 1;

        getFormProperties(formId).then(formProperties => {
            if (!ignore) {
                setFormProperties(formProperties);
            }
        });

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <form className="text-center flex flex-col items-center justify-center" onSubmit={handleSubmit}>
            <h3 className="mb-4 text-xl font-normal">Contact Form</h3>
            <div className="flex flex-col w-full space-y-6">
                <div className="flex flex-col items-start justify-center space-y-2 w-full">
                    <label htmlFor="typeOfContact-Personal" className="flex flex-row">Type of Contact <span className="ml-1 text-[red]">*</span></label>
                    <div className="flex flex-row space-x-4">
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-radio mr-2" name="typeOfContact" type="radio" id="typeOfContact-Personal" value="Personal" onChange={event => setFormData({ ...formData, typeOfContact: event.target.value })} required /> Personal
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-radio mr-2" name="typeOfContact" type="radio" id="typeOfContact-Organization" value="Organization" onChange={event => setFormData({ ...formData, typeOfContact: event.target.value })} required /> Organization
                        </label>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="firstName">First Name <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input w-full" name="firstName" type="text" id="firstName" value={formData.firstName} onChange={event => setFormData({ ...formData, firstName: event.target.value })} required />
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="lastName">Last Name <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input w-full" name="lastName" type="text" id="lastName" value={formData.lastName} onChange={event => setFormData({ ...formData, lastName: event.target.value })} required />
                    </div>
                </div>
                <div className="flex flex-row w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="companyName">Organization Name</label>
                        <input className="form-input w-full" name="companyName" type="text" id="companyName" value={formData.companyName} onChange={event => setFormData({ ...formData, companyName: event.target.value })} />
                    </div>
                </div>
                <div className="flex flex-row w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="email">Email <span className="ml-1 text-[red]">*</span></label>
                        <div className="text-sm">We&apos;ll never share your email with anyone else.</div>
                        <input className="form-input w-full" name="email" type="email" id="email" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })} required />
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="cellPhone">Cell Phone</label>
                        <input className="form-input w-full" name="cellPhone" type="tel" id="cellPhone" value={formData.cellPhone} onChange={event => setFormData({ ...formData, cellPhone: event.target.value })} />
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="homePhone">Home Phone</label>
                        <input className="form-input w-full" name="homePhone" type="tel" id="homePhone" value={formData.homePhone} onChange={event => setFormData({ ...formData, homePhone: event.target.value })} />
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="workPhone">Work Phone</label>
                        <input className="form-input w-full" name="workPhone" type="tel" id="workPhone" value={formData.workPhone} onChange={event => setFormData({ ...formData, workPhone: event.target.value })} />
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="subject">Subject <span className="ml-1 text-[red]">*</span></label>
                        <select className="form-select w-full" name="subject" id="subject" value={formData.subject} onChange={event => setFormData({ ...formData, subject: event.target.value })} required>
                            <option value="">I need some help with...</option>
                            <option value="myHomework">My homework</option>
                            <option value="practicingMyHammerDance">Practicing my hammer dance</option>
                            <option value="findingMyBellyButton">Finding my belly button</option>
                        </select>
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="appointmentDateTime">Appointment Date &amp; Time <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input w-full" name="appointmentDateTime" type="text" id="appointmentDateTime" placeholder="YYYY/MM/DD H:MM TT" autoComplete="off" value={formData.appointmentDateTime} onChange={event => setFormData({ ...formData, appointmentDateTime: event.target.value })} required />
                    </div>
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="department">Department <span className="ml-1 text-[red]">*</span></label>
                        <select className="form-select w-full" name="department" id="department" value={formData.department} onChange={event => setFormData({ ...formData, department: event.target.value })} required>
                            <option value="">Please choose...</option>
                            <option value="sales@example.com">Sales</option>
                            <option value="service@example.com">Service</option>
                            <option value="support@example.com">Support</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="howMuchDoYouEnjoyEatingPie-1" className="flex flex-row">How much do you enjoy eating pie?</label>
                        <div className="flex flex-row space-x-4">
                            <label htmlFor="howMuchDoYouEnjoyEatingPie-1" className="flex flex-row items-center justify-center">
                                <input className="form-radio mr-2" name="howMuchDoYouEnjoyEatingPie" type="radio" id="howMuchDoYouEnjoyEatingPie-1" value="1" onChange={event => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> 1
                            </label>
                            <label htmlFor="howMuchDoYouEnjoyEatingPie-2" className="flex flex-row items-center justify-center">
                                <input className="form-radio mr-2" name="howMuchDoYouEnjoyEatingPie" type="radio" id="howMuchDoYouEnjoyEatingPie-2" value="2" onChange={event => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> 2
                            </label>
                            <label htmlFor="howMuchDoYouEnjoyEatingPie-3" className="flex flex-row items-center justify-center">
                                <input className="form-radio mr-2" name="howMuchDoYouEnjoyEatingPie" type="radio" id="howMuchDoYouEnjoyEatingPie-3" value="3" onChange={event => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> 3
                            </label>
                            <label htmlFor="howMuchDoYouEnjoyEatingPie-4" className="flex flex-row items-center justify-center">
                                <input className="form-radio mr-2" name="howMuchDoYouEnjoyEatingPie" type="radio" id="howMuchDoYouEnjoyEatingPie-4" value="4" onChange={event => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> 4
                            </label>
                            <label htmlFor="howMuchDoYouEnjoyEatingPie-5" className="flex flex-row items-center justify-center">
                                <input className="form-radio mr-2" name="howMuchDoYouEnjoyEatingPie" type="radio" id="howMuchDoYouEnjoyEatingPie-5" value="5" onChange={event => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> 5
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="message">Message <span className="ml-1 text-[red]">*</span></label>
                        <textarea className="form-textarea w-full" name="message" id="message" rows={5} value={formData.message} onChange={event => setFormData({ ...formData, message: event.target.value })} required></textarea>
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="howDidYouHearAboutThisJobPosting-Newspaper">How did you hear about us?</label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-checkbox mr-2" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Newspaper" value="Newspaper" onChange={handleHowDidYouHearAboutThisJobPosting} /> Newspaper
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-checkbox mr-2" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Radio" value="Radio" onChange={handleHowDidYouHearAboutThisJobPosting} /> Radio
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-checkbox mr-2" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-CarrierPigeon" value="Carrier Pigeon" onChange={handleHowDidYouHearAboutThisJobPosting} /> Carrier Pigeon
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="form-checkbox mr-2" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Other" value="Other" onChange={handleHowDidYouHearAboutThisJobPosting} /> Other
                        </label>
                    </div>
                    <div className="flex flex-col items-start justify-start space-y-2 w-full">
                        <label htmlFor="howHeardOther">Other</label>
                        <div className="text-sm">Please describe how you heard about us.</div>
                        <input className="form-input w-full" name="howHeardOther" type="text" id="howHeardOther" value={formData.howHeardOther} onChange={event => setFormData({ ...formData, howHeardOther: event.target.value })} />
                    </div>
                </div>
                <div className="flex flex-row space-x-4 w-full">
                    <div className="flex flex-col items-start justify-center space-y-2 w-full">
                        <label htmlFor="acceptTerms" className="flex flex-row items-center justify-center">
                            <input className="form-checkbox mr-2" name="acceptTerms" type="checkbox" id="acceptTerms" value="yes" onChange={event => setFormData({ ...formData, acceptTerms: event.target.checked ? event.target.value : '' })} required />
                            I agree to the <a href="https://solspace.com" className="mx-1 underline">terms &amp; conditions</a> required by this site. <span className="ml-1 text-[red]">*</span>
                        </label>
                    </div>
                </div>
                <div className="flex flex-row w-full">
                    <div className="flex flex-row items-center justify-center space-y-2 w-full">
                        <button className="btn-primary" type="submit">Submit</button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default function ContactForm() {
    return (
        <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
            <Form />
        </GoogleReCaptchaProvider>
    );
};

import React, { useCallback, useEffect, useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { ApolloClient, gql, useMutation, InMemoryCache, ApolloProvider } from '@apollo/client';

// ENTER YOUR FORM ID HERE
const FORM_ID = 1;

// ENTER YOUR RECAPTCHA KEY HERE
const RECAPTCHA_SITE_KEY = '6LeApZMrAAAAAFL3uAaRsuJH5RsNkn7gyZJsDaFy';

const defaultFormData = {
    workPhone: '',
    subject: '',
    message: '',
    lastName: '',
    howMuchDoYouEnjoyEatingPie: '',
    howDidYouHearAboutThisJobPosting: [],
    homePhone: '',
    firstName: '',
    email: '',
    department: '',
    companyName: '',
    cellPhone: '',
    appointmentDate: '',
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
    loadingText: '',
    successMessage: '',
    errorMessage: '',
};

const client = new ApolloClient({
    uri: '/craft/graphql/api',
    headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest',
        'X-Craft-Solspace-Freeform-Mode': 'Headless',
    },
    cache: new InMemoryCache(),
});

const SAVE_QUOTE_SUBMISSION = gql`
    mutation SaveQuoteSubmission(
        $honeypot: FreeformHoneypotInputType,
        $reCaptcha: FreeformSubmissionReCaptchaInputType,
        $csrfToken: FreeformCsrfTokenInputType,
        $workPhone: String,
        $subject: String,
        $message: String,
        $lastName: String,
        $howMuchDoYouEnjoyEatingPie: String,
        $howDidYouHearAboutThisJobPosting: [String],
        $homePhone: String,
        $firstName: String,
        $email: String,
        $department: String,
        $companyName: String,
        $cellPhone: String,
        $appointmentDate: DateTime,
        $acceptTerms: String
    ) {
        save_quote_Submission(
            honeypot: $honeypot
            reCaptcha: $reCaptcha
            csrfToken: $csrfToken
            workPhone: $workPhone
            subject: $subject
            message: $message
            lastName: $lastName
            howMuchDoYouEnjoyEatingPie: $howMuchDoYouEnjoyEatingPie
            howDidYouHearAboutThisJobPosting: $howDidYouHearAboutThisJobPosting
            homePhone: $homePhone
            firstName: $firstName
            email: $email
            department: $department
            companyName: $companyName
            cellPhone: $cellPhone
            appointmentDate: $appointmentDate
            acceptTerms: $acceptTerms
        ) {
            submissionId
            success
        }
    }
`;

async function getFormProperties() {
    // See https://docs.solspace.com/craft/freeform/v4/developer/graphql/#how-to-render-a-form
    const response = await fetch(`/craft/freeform/form/properties/${FORM_ID}`, {
        headers: {
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Craft Freeform Form properties');
    }

    return response.json();
}

const Form = () => {
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [formData, setFormData] = useState(defaultFormData);
    const [formProperties, setFormProperties] = useState(defaultFormProperties);
    const [showSpam, setShowSpam] = useState(false);
    const [showError, setShowError] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const [saveQuoteSubmission] = useMutation(SAVE_QUOTE_SUBMISSION, {
        onCompleted: (data) => {
            stopProcessing();

            if (data?.save_quote_Submission) {
                showSubmissionSuccess();
            } else {
                showSubmissionError();
            }
        },
        onError: ({ graphQLErrors }) => {
            stopProcessing();
            showSubmissionError();

            graphQLErrors.forEach(({ message }) => {
                if (message.includes('Please verify that you are not a robot.')) {
                    showSpamError();
                } else if (message.includes('Unknown argument')) {
                    console.error(message);
                } else {
                    try {
                        const messages = JSON.parse(message);
                        messages.forEach((message) => showFieldError(message));
                    } catch {
                        console.error(message);
                    }
                }
            });
        },
    });

    const startProcessing = () => {
        setIsProcessing(true);
    };

    const stopProcessing = () => {
        setIsProcessing(false);
    };

    const showSubmissionSuccess = () => {
        setShowSuccess(true);
        scrollToTop();
    };

    const hideSubmissionSuccess = () => {
        setShowSuccess(false);
    };

    const showSubmissionError = () => {
        setShowError(true);
        scrollToTop();
    };

    const hideSubmissionError = () => {
        setShowError(false);
        setFieldErrors({});
    };

    const showSpamError = () => {
        setShowSpam(true);
        scrollToTop();
    };

    const hideSpamError = () => {
        setShowSpam(false);
    };

    const showFieldError = (message) => {
        setFieldErrors((currentErrors) => {
            const nextErrors = { ...currentErrors };

            for (const [key, value] of Object.entries(message)) {
                if (!/^-?\d+$/.test(key) && Array.isArray(value) && value.length) {
                    nextErrors[key] = value[0];
                }
            }

            return nextErrors;
        });
    };

    const clearFieldError = (fieldName) => {
        setFieldErrors((currentErrors) => {
            const nextErrors = { ...currentErrors };

            delete nextErrors[fieldName];

            return nextErrors;
        });
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const isFormReady = Boolean(formProperties.csrf?.name && formProperties.csrf?.token);

    const handleReCaptchaVerify = useCallback(async () => {
        if (!executeRecaptcha) {
            return null;
        }

        return await executeRecaptcha('submit');
    }, [executeRecaptcha]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isFormReady) {
            return;
        }

        const { csrf, honeypot, reCaptcha } = formProperties;

        hideSpamError();
        hideSubmissionError();
        hideSubmissionSuccess();
        startProcessing();

        try {
            let reCaptchaInput = undefined;

            if (reCaptcha?.enabled) {
                const token = await handleReCaptchaVerify();

                reCaptchaInput = {
                    name: reCaptcha.name,
                    value: token,
                };
            }

            await saveQuoteSubmission({
                variables: {
                    honeypot: {
                        name: honeypot.name,
                        value: honeypot.value,
                    },
                    csrfToken: {
                        name: csrf.name,
                        value: csrf.token,
                    },
                    reCaptcha: reCaptchaInput,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    companyName: formData.companyName,
                    email: formData.email,
                    cellPhone: formData.cellPhone,
                    homePhone: formData.homePhone,
                    workPhone: formData.workPhone,
                    subject: formData.subject,
                    appointmentDate: formData.appointmentDate,
                    department: formData.department,
                    howMuchDoYouEnjoyEatingPie: formData.howMuchDoYouEnjoyEatingPie,
                    message: formData.message,
                    howDidYouHearAboutThisJobPosting: formData.howDidYouHearAboutThisJobPosting,
                    acceptTerms: formData.acceptTerms,
                },
            });
        } catch (error) {
            stopProcessing();
            showSubmissionError();

            console.error(error);
        }
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

    /**
     * Note the ignore variable which is initialized to false, and is set to true during cleanup.
     * This ensures your code doesn't suffer from "race conditions": network responses may arrive in a different order than you sent them.
     */
    useEffect(() => {
        let ignore = false;

        getFormProperties()
            .then((formProperties) => {
                if (!ignore) {
                    setFormProperties(formProperties);
                }
            })
            .catch((error) => {
                if (!ignore) {
                    console.error(error);

                    setShowError(true);
                }
            });

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <form className="text-center flex flex-col items-left justify-left" onSubmit={handleSubmit}>
            <h3 className="mb-4 text-xl font-normal text-left">Quote Form</h3>
            {showSuccess && (
                <div id="successMessage" className="w-full bg-green-100 border border-green-400 text-sm text-left text-green-700 px-4 py-2 rounded-md mb-8">
                    <p>{formProperties.successMessage}</p>
                </div>
            )}
            {showError && (
                <div id="errorMessage" className="w-full bg-red-100 border border-red-400 text-sm text-left text-red-500 px-4 py-2 rounded-md mb-8">
                    <p>{formProperties.errorMessage}</p>
                </div>
            )}
            {showSpam && (
                <div id="spamMessage" className="w-full bg-red-100 border border-red-400 text-sm text-left text-red-500 px-4 py-2 rounded-md mb-8">
                    <p>Please verify that you are not a robot.</p>
                </div>
            )}
            <div className="flex flex-col w-full space-y-3">
                <div className="form-row">
                    <div className="field-wrapper firstName-field">
                        <label htmlFor="firstName">First Name <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input field-input" name="firstName" type="text" id="firstName" value={formData.firstName} onChange={event => { setFormData({ ...formData, firstName: event.target.value }); clearFieldError('firstName'); }} />
                        {fieldErrors.firstName && (
                            <span className="field-error error-message flex">{fieldErrors.firstName}</span>
                        )}
                    </div>
                    <div className="field-wrapper lastName-field">
                        <label htmlFor="lastName">Last Name <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input field-input" name="lastName" type="text" id="lastName" value={formData.lastName} onChange={event => { setFormData({ ...formData, lastName: event.target.value }); clearFieldError('lastName'); }} />
                        {fieldErrors.lastName && (
                            <span className="field-error error-message flex">{fieldErrors.lastName}</span>
                        )}
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper">
                        <label htmlFor="companyName">Organization Name</label>
                        <input className="form-input field-input" name="companyName" type="text" id="companyName" value={formData.companyName} onChange={event => setFormData({ ...formData, companyName: event.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper email-field">
                        <label htmlFor="email">Email <span className="ml-1 text-[red]">*</span></label>
                        <div className="text-sm text-slate-400">We&apos;ll never share your email with anyone else.</div>
                        <input className="form-input field-input" name="email" type="email" id="email" value={formData.email} onChange={event => { setFormData({ ...formData, email: event.target.value }); clearFieldError('email'); }} />
                        {fieldErrors.email && (
                            <span className="field-error error-message flex">{fieldErrors.email}</span>
                        )}
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper cellPhone-field">
                        <label htmlFor="cellPhone">Cell Phone <span className="ml-1 text-[red]">*</span></label>
                        <input className="form-input field-input" name="cellPhone" type="tel" id="cellPhone" value={formData.cellPhone} onChange={event => { setFormData({ ...formData, cellPhone: event.target.value }); clearFieldError('cellPhone'); }} />
                        {fieldErrors.cellPhone && (
                            <span className="field-error error-message flex">{fieldErrors.cellPhone}</span>
                        )}
                    </div>
                    <div className="field-wrapper">
                        <label htmlFor="homePhone">Home Phone</label>
                        <input className="form-input field-input" name="homePhone" type="tel" id="homePhone" value={formData.homePhone} onChange={event => setFormData({ ...formData, homePhone: event.target.value })} />
                    </div>
                    <div className="field-wrapper">
                        <label htmlFor="workPhone">Work Phone</label>
                        <input className="form-input field-input" name="workPhone" type="tel" id="workPhone" value={formData.workPhone} onChange={event => setFormData({ ...formData, workPhone: event.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper subject-field">
                        <label htmlFor="subject">Subject <span className="ml-1 text-[red]">*</span></label>
                        <select className="form-select field-input" name="subject" id="subject" value={formData.subject} onChange={event => { setFormData({ ...formData, subject: event.target.value }); clearFieldError('subject'); }}>
                            <option value="">I need some help with...</option>
                            <option value="myHomework">My homework</option>
                            <option value="practicingMyHammerDance">Practicing my hammer dance</option>
                            <option value="findingMyBellyButton">Finding my belly button</option>
                        </select>
                        {fieldErrors.subject && (
                            <span className="field-error error-message flex">{fieldErrors.subject}</span>
                        )}
                    </div>
                    <div className="field-wrapper">
                        <label htmlFor="appointmentDate">Appointment Date</label>
                        <input className="form-input field-input" name="appointmentDate" type="text" id="appointmentDate" placeholder="YYYY/MM/DD" autoComplete="off" value={formData.appointmentDate} onChange={event => setFormData({ ...formData, appointmentDate: event.target.value })} />
                    </div>
                    <div className="field-wrapper department-field">
                        <label htmlFor="department">Department <span className="ml-1 text-[red]">*</span></label>
                        <select className="form-select field-input" name="department" id="department" value={formData.department} onChange={event => { setFormData({ ...formData, department: event.target.value }); clearFieldError('department'); }}>
                            <option value="">Please choose...</option>
                            <option value="sales@example.com">Sales</option>
                            <option value="service@example.com">Service</option>
                            <option value="support@example.com">Support</option>
                        </select>
                        {fieldErrors.department && (
                            <span className="field-error error-message flex">{fieldErrors.department}</span>
                        )}
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper">
                        <label htmlFor="howMuchDoYouEnjoyEatingPie-1" className="flex flex-row">How much do you enjoy eating pie?</label>
                        <div className="flex flex-row space-x-4">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <label key={value} htmlFor={`howMuchDoYouEnjoyEatingPie-${value}`} className="flex flex-row items-center justify-center">
                                    <input className="field-input-radio" name="howMuchDoYouEnjoyEatingPie" type="radio" id={`howMuchDoYouEnjoyEatingPie-${value}`} value={String(value)} onChange={(event) => setFormData({ ...formData, howMuchDoYouEnjoyEatingPie: event.target.value })} /> {value}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper message-field">
                        <label htmlFor="message">Message <span className="ml-1 text-[red]">*</span></label>
                        <textarea className="form-textarea field-input" name="message" id="message" rows={5} value={formData.message} onChange={event => { setFormData({ ...formData, message: event.target.value }); clearFieldError('message'); }}></textarea>
                        {fieldErrors.message && (
                            <span className="field-error error-message flex">{fieldErrors.message}</span>
                        )}
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper">
                        <label htmlFor="howDidYouHearAboutThisJobPosting-Newspaper">How did you hear about us?</label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="field-input-checkbox" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Newspaper" value="Newspaper" onChange={handleHowDidYouHearAboutThisJobPosting} /> Newspaper
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="field-input-checkbox" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Radio" value="Radio" onChange={handleHowDidYouHearAboutThisJobPosting} /> Radio
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="field-input-checkbox" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-CarrierPigeon" value="Carrier Pigeon" onChange={handleHowDidYouHearAboutThisJobPosting} /> Carrier Pigeon
                        </label>
                        <label className="flex flex-row items-center justify-center">
                            <input className="field-input-checkbox" name="howDidYouHearAboutThisJobPosting[]" type="checkbox" id="howDidYouHearAboutThisJobPosting-Other" value="Other" onChange={handleHowDidYouHearAboutThisJobPosting} /> Other
                        </label>
                    </div>
                </div>
                <div className="form-row">
                    <div className="field-wrapper acceptTerms-field">
                        <label htmlFor="acceptTerms" className="flex flex-row items-center justify-center">
                            <input className="field-input-checkbox" name="acceptTerms" type="checkbox" id="acceptTerms" value="yes" onChange={event => { setFormData({ ...formData, acceptTerms: event.target.checked ? event.target.value : '' }); clearFieldError('acceptTerms'); }} />
                            I agree to the <a href="https://solspace.com" className="mx-1 underline">terms &amp; conditions</a> required by this site. <span className="ml-1 text-[red]">*</span>
                        </label>
                        {fieldErrors.acceptTerms && (
                            <span className="field-error error-message flex">{fieldErrors.acceptTerms}</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-row w-full">
                    <div className="flex flex-row items-left justify-left space-y-2 w-full">
                        <button className="btn-primary" type="submit" disabled={isProcessing || !isFormReady} style={{ cursor: isProcessing || !isFormReady ? 'not-allowed' : 'pointer' }}>{isProcessing ? formProperties.loadingText || 'Submitting...' : !isFormReady ? 'Loading...' : 'Submit'}</button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default function QuoteForm() {
    return (
        <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
            <ApolloProvider client={client}>
                <Form />
            </ApolloProvider>
        </GoogleReCaptchaProvider>
    );
};

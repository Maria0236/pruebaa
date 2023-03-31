import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

import {
  getOrganizationUsers,
  sendInvites,
  resendInvite,
  deleteInvite,
  deleteUser,
  verifyIfUserExists,
  createUserOrganizationRelation,
  createTenant,
  createOrganization,
  getTenants
} from '../../api/users';
import { Formik, Form, Field } from 'formik';
import useLoading from '../../hooks/useLoading';
import Settings from '../../components/Settings';
import Button from '../../components/Button';
import LoadingScreen from '../../components/LoadingScreen';
import UserElement from '../../components/UserElement';
import TenantElement from '../../components/TenantElement';
import InviteElement from '../../components/InviteElement';
import { mapObj } from '../../utils';
import { withAuthentication } from '../../utils/withAuthentication';
import * as Yup from 'yup';
import { SideNavModal } from '../../components/modals/SideNavModal';
import TextArea from '../../components/TextArea';
import Alert from "../../components/Alert";
import InviteMembers from '../../components/modals/InviteMembers';
import FormInput from '../../components/form/FormInput';
import FormSelect from '../../components/form/FormSelect';
import CloseIcon from '../../components/icons/closeIcon';
import { useAppContext } from '../../contexts/appContext';
import { TenantValidationSchema } from '../../validations/tenantValidator';
import ConfirmModal from '../../components/modals/ConfirmModal';
import Loading from '../../components/Loading';
import { phoneNumberPrefixes } from '../../constants';
import countries from '../../public/data/countries.json';
import { formatToPhoneNumber } from '../../utils';
import { SketchPicker } from 'react-color'
import reactCSS from 'reactcss'
import { useTranslation, initReactI18next } from "react-i18next";
export function Tenants(props) {
  const { t } = useTranslation();
  const { session } = props;
  const { organizations, token, currentOrganization: organization, userData, logout } = session;
  const { addSuccessAlert, addErrorAlert } = useAppContext();
  const [emails, setEmails] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [showAlertSuccess, setShowAlertSuccess] = useState(false);
  const [showAlertError, setShowAlertError] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isFormLoading, setFormLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState({
    displayColorPicker: false,
    hex: "#975423",
    color: {
      r: "241",
      g: "112",
      b: "19",
      a: "1"
    }
  });
  const [secondaryColor, setSecondaryColor] = useState({
    displayColorPicker: false,
    hex: "#4A90E2",
    color: {
      r: "74",
      g: "144",
      b: "226",
      a: "1"
    }
  });
  const hiddenFileInput = useRef(null);
  const [fileUploaded, setFileUploaded] = useState(null)
  const [urlLogo, setUrlLogo] = useState(null)

  const handleClickB = event => {
    event.preventDefault()
    hiddenFileInput.current.click();
  };
  const handleChangeB = event => {
    const _fileUploaded = event.target.files[0];
    setFileUploaded(_fileUploaded);
  };

  useEffect(() => {
    async function fetchData() {
      let emailInfo = userData?.userInfo?.email || ''
      const newUserData = await verifyIfUserExists({ email: emailInfo });
      /** Si no es un usuario activo, que te desloguee */
      if (!newUserData?.userInfo?.isActive) {
        logout()
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (fileUploaded) {
      let _urlLogo = URL ? URL.createObjectURL(fileUploaded) : webkitURL.createObjectURL(fileUploaded)
      setUrlLogo(_urlLogo)
    }

  }, [fileUploaded]);

  const confirmRef = useRef();

  const orgId =
    organizations.length > 0 ? organization && organization.id : null;
  const { data } = useSWR(
    ["getTenants", token],
    (_, token) => getTenants(token)
  );
  const { isLoading, setLoading } = useLoading([data, organizations]);
  const [phoneNumberPrefix, setPhoneNumberPrefix] = useState("");

  const handleClick = (type) => {
    if (type === "primary") {
      setPrimaryColor({
        ...primaryColor,
        displayColorPicker: !primaryColor.displayColorPicker
      });
    }
    if (type === "secondary") {
      setSecondaryColor({
        ...secondaryColor,
        displayColorPicker: !secondaryColor.displayColorPicker
      });
    }
  };

  const handleClose = (type) => {
    if (type === "primary") {
      setPrimaryColor({ ...primaryColor, displayColorPicker: false });
    }
    if (type === "secondary") {
      setSecondaryColor({ ...secondaryColor, displayColorPicker: false });
    }
  };

  const handleChange = (type, color) => {
    if (type === "primary") {
      setPrimaryColor({ ...primaryColor, color: color.rgb, hex: color.hex });
    }
    if (type === "secondary") {
      setSecondaryColor({
        ...secondaryColor,
        color: color.rgb,
        hex: color.hex
      });
    }
  };

  async function handleSubmit(values) {
    setSubmitting(true);
    try {

      const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });


      const newValues = {
        ...values,
        primaryColor: primaryColor.hex,
        secondaryColor: secondaryColor.hex,
        logo: (fileUploaded ? { data: await toBase64(fileUploaded), extension: /[^.]+$/.exec(fileUploaded.name) } : null)
      };

      const response = await createTenant(newValues);

      setSubmitting(false);
      // onSubmit(notes);
      if (response.success) {
        setModalOpen(false);
        setEditModalOpen(false);
        addSuccessAlert(`Tenant ${response.tenant.name} saved successfully.`);
        let newOrganization = {
          "name": response.tenant.name,
          "phoneNumber": response.tenant.phoneNumber,
          "city": response.tenant.city,
          "state": response.tenant.state,
          "zipCode": response.tenant.zipCode,
          "country": response.tenant.country,
          "streetAddress": response.tenant.streetAddress,
          "streetAddress2": response.tenant.streetAddress2,
          "tenantId": response.tenant.id
        }

        const responseOrg = await createOrganization(newOrganization);
        if (responseOrg.success) {
          addSuccessAlert(`Organization ${responseOrg.organization.name} saved successfully.`);
        }
      }
      // onClose();
    } catch (e) {
      addErrorAlert("There was an error adding a Tenant.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }
  useEffect(() => {
    if (data && data.allTenants) {
      setTenants(data.allTenants);
    }
  }, [data]);

  async function createRelationIfUsersExists(emails) {
    let invitesToSend = [];
    //Ver si usuario existe, si existe es porque esta asociado a otra organización
    const verifyEmails = emails.map(async (email) => {
      let result = await verifyIfUserExists({ email: email });

      if (result.userInfo) {
        let createRelation = await createUserOrganizationRelation({
          user: result.userInfo,
          organization: organization
        });
      } else {
        //Enviar invitacion
        invitesToSend.push(email);
      }
    });
    if (invitesToSend && invitesToSend.length > 0) {
      await sendInvites(organization.id, invitesToSend, token);
      addSuccessAlert("The invites have been sent successfully.");
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }
  const [ tenant, setTenant] = useState({
    tenant: null,
  });
  const basicInformationInitialValues = {
    name: "",
    url: "",
    contactName: "",
    phoneNumber: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    streetAddress: "",
    streetAddress2: "",
    contactNameShow: "",
    phoneNumberShow: "",
    emailShow: ""
  };
  const tenantFormInitialValues = {
    id: "",
    name: "",
    url: "",
    contactName: "",
    phoneNumber: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    streetAddress: "",
    streetAddress2: "",
    contactNameShow: "",
    phoneNumberShow: "",
    emailShow: ""
  };
  const getTenantFormInitialValues = (
    initialValues,
    tenantsId,
    equipmentTypes = []
  ) => {
    const tenant = mapObj(initialValues);

  const tenantId = tenantsId.find(
    (ti) => ti.code === tenant.id
  );

  if (tenantId) {
    tenant. = equipmentType.code;
  }

  return tenant;
};
const [tenantInitialValues, setTenantInitialValues] = useState(
  getTenantFormInitialValues(mapObj(tenantFormInitialValues, tenant))
);

  const onPhoneNumberPrefixChange = ({ target: { value } }) => {
    setPhoneNumberPrefix(value);
  };

  const onPhoneNumberChange = (e, setFieldValue) => {
    const { phoneNumber } = formatToPhoneNumber(e.target.value);
    setFieldValue("phoneNumber", phoneNumber, true);
  };

  const onPhoneNumberShowChange = (e, setFieldValue) => {
    const { phoneNumber } = formatToPhoneNumber(e.target.value);
    setFieldValue("phoneNumberShow", phoneNumber, true);
  };

  const styles = reactCSS({
    default: {
      primaryColor: {
        width: "36px",
        height: "14px",
        borderRadius: "2px",
        background: `rgba(${primaryColor.color.r}, ${primaryColor.color.g}, ${primaryColor.color.b}, ${primaryColor.color.a})`
      },
      secondaryColor: {
        width: "36px",
        height: "14px",
        borderRadius: "2px",
        background: `rgba(${secondaryColor.color.r}, ${secondaryColor.color.g}, ${secondaryColor.color.b}, ${secondaryColor.color.a})`
      }
    }
  });

  const renderHeaderOptions = (legend = "", isReadOnly) => {
    let buttonLegend = "";

    if (!isReadOnly) {
      buttonLegend = t("Save") + ` ${legend}`;
      return (
        <>
          <Button
            size="small"
            className="ml-auto"
            dropdown
            primary
            loading={isLoading}
            disabled={isSubmitting}
            type="submit"
          >
            {buttonLegend}
          </Button>
          <Button
            size="small"
            className="ml-2"
            dropdown
            disabled={isSubmitting}
            onClick={() => setModalOpen(false)}
          >
            {t("Cancel")}
          </Button>
        </>
      );
    }
    buttonLegend = `Close ${legend}`;
    return (
      <Button size="small" className="ml-auto" dropdown onClick={onCancel}>
        {buttonLegend}
      </Button>
    );
  };

  const getTenantsList = async () => {
    await getTenants(token).then((data) => {
      setTenants(data);
    });
  }

  const renderTenants = () => {
    return tenants && tenants.length && tenants.map((tenant) => (
      <div className="flex justify-between">
        <UserElement
          key={tenant.name}
          user={tenant}
          session={session}
          //onDelete={() => confirmDeleteUserRef.current.open(user)}
          getUsersList={getTenantsList}
          setShowAlertSuccess={(e) => setShowAlertSuccess(e)}
          setShowAlertError={(e) => setShowAlertError(e)}
          initialA={tenant.name}
          initialB={tenant.city}
          title={tenant.name}
          subtitle={tenant.url}
          type="tenant"
        />
        <Button outline size="small" className="ml-auto mt-6" onClick={() => setEditModalOpen(true)}>
          {t('Edit')}
        </Button>
      </div>
    ));
  };

  const renderCloseConfirmModal = () => {
    return (
      <ConfirmModal
        title={t("Are you sure to do this?")}
        cancelText={t("Cancel")}
        confirmText={t("Close")}
        onConfirm={() => setModalOpen(false)}
        ref={confirmRef}
      >
        {(context) => (
          <div className="text-sm leading-5 text-gray-500">
            {t("Close")}
          </div>
        )}
      </ConfirmModal>
    );
  };
  const renderCloseEditConfirmModal = () => {
    return (
      <ConfirmModal
        title={t("Are you sure to do this?")}
        cancelText={t("Cancel")}
        confirmText={t("Close")}
        onConfirm={() => setEditModalOpen(false)}
        ref={confirmRef}
      >
        {(context) => (
          <div className="text-sm leading-5 text-gray-500">
            {t("Close")}
          </div>
        )}
      </ConfirmModal>
    );
  };
  return (
    <Settings className="w-full">
      {showAlertSuccess && (
        <div className="col-span-12">
          <Alert type="success" onClose={() => setShowAlertSuccess(false)}>
            <span className="text-xs">{t('The role was updated successfully!')}</span>
          </Alert>
        </div>
      )}
      {showAlertError && (
        <div className="col-span-12">
          <Alert type="danger" onClose={() => setShowAlertError(false)}>
            <span className="text-xs">{t('It was a problem updating the role!')}</span>
          </Alert>
        </div>
      )}

      {isModalOpen && (
        <>
          <SideNavModal
            onClose={() => confirmRef.current.open()}
            contentDirection="right"
          >
            <div className="bg-white h-full w-full">
              <Formik
                enableReinitialize
                initialValues={basicInformationInitialValues}
                validationSchema={TenantValidationSchema}
                onSubmit={handleSubmit}
              >
                {({ setFieldValue }) => (
                  <Form>
                    {/* <Button type="submit" primary loading={isFormLoading}>
                    Save Changes
                  </Button> */}
                    <div className="border-gray-200 border-t border-b py-4 px-8">
                      <div className="flex items-center">
                        <span
                          className="cursor-pointer"
                          onClick={() => setModalOpen(false)}
                        >
                          <CloseIcon />
                        </span>
                        <h1 className="text-gray-700 font-semibold text-base ml-3">
                          {t("New Tenant")}
                        </h1>
                        {renderHeaderOptions(t("Tenant"), readOnlyMode)}
                      </div>
                    </div>

                    <div className="p-10">
                      <Field
                        label={t("Tenant")}
                        name="name"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <Field
                        label="URL"
                        name="url"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("url", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Allowed Domains")}
                        name="allowedDomains"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("allowedDomains", e.target.value.trim());
                        }}
                      />
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t('Contact Information')}
                        </h1>
                      </div>
                      <Field
                        label={t("Contact Name")}
                        name="contactName"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("contactName", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Phone Number")}
                        name="phoneNumber"
                        prefixValue={phoneNumberPrefix}
                        onChangePrefix={onPhoneNumberPrefixChange}
                        prefixes={phoneNumberPrefixes}
                        component={FormInput}
                        onChange={(e) => onPhoneNumberChange(e, setFieldValue)}
                      />
                      <Field
                        label={t("Email Address")}
                        name="email"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("email", e.target.value.trim());
                        }}
                      />
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t("Tenant Address")}
                        </h1>
                      </div>
                      <Field
                        label={t("Street Address")}
                        name="streetAddress"
                        placeholder="9th avenue 1294"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <Field
                        label={`${t("Street Address")} 2`}
                        name="streetAddress2"
                        placeholder="Apt #"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <div className="flex flex-wrap justify-between">
                        <div className="w-full md:w-1/2 md:pr-4">
                          <Field
                            label={t("City")}
                            name="city"
                            placeholder={t("City")}
                            component={FormInput}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                        <div className="w-full md:w-1/2">
                          <Field
                            label={t("State")}
                            name="state"
                            placeholder={t("State")}
                            component={FormInput}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex mb-4 md:mb-0 flex-wrap justify-between">
                        <div className="w-full md:w-1/2 md:pr-4">
                          <Field
                            label={t('Postal Code')}
                            name="zipCode"
                            placeholder="45450"
                            component={FormInput}
                          />
                        </div>
                        <div className="w-full md:w-1/2">
                          <Field
                            label={t('Country')}
                            textProp="name"
                            valueProp="code"
                            name="country"
                            options={countries}
                            component={FormSelect}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                        <div className="flex mb-4">
                          <h1 className="text-gray-700 font-semibold text-base">
                            {t('Tenant Settings')}
                          </h1>
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Primary Color')}
                            </span>
                          </div>
                          <div
                            className={`w-8 h-8 p-2 rounded-md cursor-pointer drop-shadow-xl ml-auto`}
                            onClick={() => handleClick("primary")}
                          >
                            <div style={styles.primaryColor} />
                          </div>
                          {primaryColor.displayColorPicker && (
                            <div className="absolute z-2">
                              <div
                                className="fixed top-0 right-0 bottom-0 left-0 "
                                onClick={() => handleClose("primary")}
                              />
                              <SketchPicker
                                color={primaryColor.color}
                                onChange={(color) =>
                                  handleChange("primary", color)
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Secondary Color')}
                            </span>
                          </div>
                          <div
                            className={`w-8 h-8 p-2 rounded-md cursor-pointer drop-shadow-xl ml-auto`}
                            onClick={() => handleClick("secondary")}
                          >
                            <div style={styles.secondaryColor} />
                          </div>
                          {secondaryColor.displayColorPicker && (
                            <div className="absolute z-2">
                              <div
                                className="fixed top-0 right-0 bottom-0 left-0 "
                                onClick={() => handleClose("secondary")}
                              />
                              <SketchPicker
                                color={secondaryColor.color}
                                onChange={(color) =>
                                  handleChange("secondary", color)
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Logo')}
                            </span>
                          </div>
                          <div
                            className="rounded-md cursor-pointer drop-shadow-xl ml-auto"
                          >
                            <Button primary onClick={handleClickB}>
                              {t('Upload a file')}
                            </Button>
                            <input type="file"
                              ref={hiddenFileInput}
                              onChange={handleChangeB}
                              style={{ display: 'none' }}
                            />

                          </div>
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <img src={urlLogo} />
                        </div>
                      </div>
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t('Contact Information to Show')}
                        </h1>
                      </div>
                      <Field
                        label={t("Contact Name")}
                        name="contactNameShow"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("contactNameShow", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Phone Number")}
                        name="phoneNumberShow"
                        prefixValue={phoneNumberPrefix}
                        onChangePrefix={onPhoneNumberPrefixChange}
                        prefixes={phoneNumberPrefixes}
                        component={FormInput}
                        onChange={(e) => onPhoneNumberShowChange(e, setFieldValue)}
                      />
                      <Field
                        label={t("Email Address")}
                        name="emailShow"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("emailShow", e.target.value.trim());
                        }}
                      />
                    </div>


                  </Form>
                )}
              </Formik>
            </div>
          </SideNavModal>
        </>
      )}
      {renderCloseConfirmModal()}
      {isEditModalOpen && (
        <>
          <SideNavModal
            onClose={() => confirmRef.current.open()}
            contentDirection="right"
          >
            <div className="bg-white h-full w-full">
              <Formik
                enableReinitialize
                initialValues={tenantInitialValues}
                validationSchema={TenantValidationSchema}
                onSubmit={handleSubmit}
              >
                {({ setFieldValue }) => (
                  <Form>
                    {/* <Button type="submit" primary loading={isFormLoading}>
                    Save Changes
                  </Button> */}
                    <div className="border-gray-200 border-t border-b py-4 px-8">
                      <div className="flex items-center">
                        <span
                          className="cursor-pointer"
                          onClick={() => setEditModalOpen(false)}
                        >
                          <CloseIcon />
                        </span>
                        <h1 className="text-gray-700 font-semibold text-base ml-3">
                          {t("Edit Tenant")}
                        </h1>
                        {renderHeaderOptions(t("Tenant"), readOnlyMode)}
                      </div>
                    </div>

                    <div className="p-10">
                      <Field
                        label={t("Tenant")}
                        name="name"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <Field
                        label="URL"
                        name="url"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("url", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Allowed Domains")}
                        name="allowedDomains"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("allowedDomains", e.target.value.trim());
                        }}
                      />
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t('Contact Information')}
                        </h1>
                      </div>
                      <Field
                        label={t("Contact Name")}
                        name="contactName"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("contactName", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Phone Number")}
                        name="phoneNumber"
                        prefixValue={phoneNumberPrefix}
                        onChangePrefix={onPhoneNumberPrefixChange}
                        prefixes={phoneNumberPrefixes}
                        component={FormInput}
                        onChange={(e) => onPhoneNumberChange(e, setFieldValue)}
                      />
                      <Field
                        label={t("Email Address")}
                        name="email"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("email", e.target.value.trim());
                        }}
                      />
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t("Tenant Address")}
                        </h1>
                      </div>
                      <Field
                        label={t("Street Address")}
                        name="streetAddress"
                        placeholder="9th avenue 1294"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <Field
                        label={`${t("Street Address")} 2`}
                        name="streetAddress2"
                        placeholder="Apt #"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue(e.target.name, e.target.value.trim());
                        }}
                      />
                      <div className="flex flex-wrap justify-between">
                        <div className="w-full md:w-1/2 md:pr-4">
                          <Field
                            label={t("City")}
                            name="city"
                            placeholder={t("City")}
                            component={FormInput}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                        <div className="w-full md:w-1/2">
                          <Field
                            label={t("State")}
                            name="state"
                            placeholder={t("State")}
                            component={FormInput}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex mb-4 md:mb-0 flex-wrap justify-between">
                        <div className="w-full md:w-1/2 md:pr-4">
                          <Field
                            label={t('Postal Code')}
                            name="zipCode"
                            placeholder="45450"
                            component={FormInput}
                          />
                        </div>
                        <div className="w-full md:w-1/2">
                          <Field
                            label={t('Country')}
                            textProp="name"
                            valueProp="code"
                            name="country"
                            options={countries}
                            component={FormSelect}
                            onBlur={(e) => {
                              setFieldValue(
                                e.target.name,
                                e.target.value.trim()
                              );
                            }}
                          />
                        </div>
                        <div className="flex mb-4">
                          <h1 className="text-gray-700 font-semibold text-base">
                            {t('Tenant Settings')}
                          </h1>
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Primary Color')}
                            </span>
                          </div>
                          <div
                            className={`w-8 h-8 p-2 rounded-md cursor-pointer drop-shadow-xl ml-auto`}
                            onClick={() => handleClick("primary")}
                          >
                            <div style={styles.primaryColor} />
                          </div>
                          {primaryColor.displayColorPicker && (
                            <div className="absolute z-2">
                              <div
                                className="fixed top-0 right-0 bottom-0 left-0 "
                                onClick={() => handleClose("primary")}
                              />
                              <SketchPicker
                                color={primaryColor.color}
                                onChange={(color) =>
                                  handleChange("primary", color)
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Secondary Color')}
                            </span>
                          </div>
                          <div
                            className={`w-8 h-8 p-2 rounded-md cursor-pointer drop-shadow-xl ml-auto`}
                            onClick={() => handleClick("secondary")}
                          >
                            <div style={styles.secondaryColor} />
                          </div>
                          {secondaryColor.displayColorPicker && (
                            <div className="absolute z-2">
                              <div
                                className="fixed top-0 right-0 bottom-0 left-0 "
                                onClick={() => handleClose("secondary")}
                              />
                              <SketchPicker
                                color={secondaryColor.color}
                                onChange={(color) =>
                                  handleChange("secondary", color)
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <div className="">
                            <span className="text-gray-700 font-semibold text-xs">
                              {t('Logo')}
                            </span>
                          </div>
                          <div
                            className="rounded-md cursor-pointer drop-shadow-xl ml-auto"
                          >
                            <Button primary onClick={handleClickB}>
                              {t('Upload a file')}
                            </Button>
                            <input type="file"
                              ref={hiddenFileInput}
                              onChange={handleChangeB}
                              style={{ display: 'none' }}
                            />

                          </div>
                        </div>
                        <div className="w-full flex flex-row rounded-md items-center mb-5">
                          <img src={urlLogo} />
                        </div>
                      </div>
                      <div className="flex mb-4">
                        <h1 className="text-gray-700 font-semibold text-base">
                          {t('Contact Information to Show')}
                        </h1>
                      </div>
                      <Field
                        label={t("Contact Name")}
                        name="contactNameShow"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("contactNameShow", e.target.value.trim());
                        }}
                      />
                      <Field
                        label={t("Phone Number")}
                        name="phoneNumberShow"
                        prefixValue={phoneNumberPrefix}
                        onChangePrefix={onPhoneNumberPrefixChange}
                        prefixes={phoneNumberPrefixes}
                        component={FormInput}
                        onChange={(e) => onPhoneNumberShowChange(e, setFieldValue)}
                      />
                      <Field
                        label={t("Email Address")}
                        name="emailShow"
                        textSize="xs"
                        component={FormInput}
                        onBlur={(e) => {
                          setFieldValue("emailShow", e.target.value.trim());
                        }}
                      />
                    </div>


                  </Form>
                )}
              </Formik>
            </div>
          </SideNavModal>
        </>
      )}
      {renderCloseEditConfirmModal()}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-3xl font-semibold text-gray-700">
          {t('Tenants')}
        </h2>
        {(session.userData.userInfo.root) && (
          <Button primary onClick={() => setModalOpen(true)}>
            {`${t('New Tenant')} +`}
          </Button>
        )}
      </div>
      <ul>
        {renderTenants()}
      </ul>
    </Settings>
  );
}

export default withAuthentication()(Tenants);
